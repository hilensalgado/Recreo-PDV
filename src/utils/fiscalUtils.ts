import { FiscalInvoice } from '../types/pos';

export function generateInvoiceXML(invoice: FiscalInvoice): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0" 
  Serie="${invoice.series}" 
  Folio="${invoice.folio}" 
  Fecha="${invoice.emittedAt}" 
  Sello="${invoice.digitalStampEmitter || 'SIMULATED_STAMP_VALUE'}" 
  FormaPago="${invoice.paymentForm.substring(0, 2)}" 
  NoCertificado="${invoice.emitter.taxId ? '30001000000500003412' : ''}" 
  SubTotal="${invoice.subtotal.toFixed(2)}" 
  Descuento="${(invoice.discount || 0).toFixed(2)}" 
  Moneda="${invoice.currency}" 
  Total="${invoice.total.toFixed(2)}" 
  TipoDeComprobante="I" 
  MetodoPago="${invoice.paymentMethod.substring(0, 3)}" 
  LugarExpedicion="${invoice.emitter.postalCode}">
  
  <cfdi:Emisor 
    Rfc="${invoice.emitter.taxId.replace(/[^A-Za-z0-9]/g, '')}" 
    Nombre="${invoice.emitter.businessName}" 
    RegimenFiscal="${invoice.emitter.taxRegime.substring(0, 3)}" />
    
  <cfdi:Receptor 
    Rfc="${invoice.receiver.taxId.replace(/[^A-Za-z0-9]/g, '')}" 
    Nombre="${invoice.receiver.name}" 
    DomicilioFiscalReceptor="${invoice.receiver.postalCode}" 
    RegimenFiscalReceptor="${invoice.receiver.taxRegime.substring(0, 3)}" 
    UsoCFDI="${invoice.receiver.cfdiUsage.substring(0, 3)}" />
    
  <cfdi:Conceptos>
    ${invoice.items
      .map(
        (item) => `
    <cfdi:Concepto 
      ClaveProdServ="${item.satProductCode || '50192100'}" 
      NoIdentificacion="${item.barcode}" 
      Cantidad="${item.quantity}" 
      ClaveUnidad="${item.satUnitCode || 'H87'}" 
      Unidad="Pieza" 
      Descripcion="${item.productName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" 
      ValorUnitario="${item.unitPrice.toFixed(2)}" 
      Importe="${item.subtotal.toFixed(2)}" 
      ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado 
            Base="${item.subtotal.toFixed(2)}" 
            Impuesto="002" 
            TipoFactor="Tasa" 
            TasaOCuota="${(item.vatRate / 100).toFixed(6)}" 
            Importe="${item.vatAmount.toFixed(2)}" />
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`
      )
      .join('')}
  </cfdi:Conceptos>
  
  <cfdi:Impuestos TotalImpuestosTrasladados="${(invoice.vatTotal + (invoice.iepsTotal || 0)).toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado 
        Base="${invoice.subtotal.toFixed(2)}" 
        Impuesto="002" 
        TipoFactor="Tasa" 
        TasaOCuota="0.160000" 
        Importe="${invoice.vatTotal.toFixed(2)}" />
    </cfdi:Traslados>
  </cfdi:Impuestos>
  
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital 
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" 
      xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd"
      Version="1.1" 
      UUID="${invoice.uuid}" 
      FechaTimbrado="${invoice.emittedAt}" 
      RfcProvCertif="SAT970701NN3" 
      SelloCFD="${invoice.digitalStampEmitter || ''}" 
      NoCertificadoSAT="00001000000504465028" 
      SelloSAT="${invoice.digitalStampSat || ''}" />
  </cfdi:Complemento>
</cfdi:Comprobante>`;

  return xml.trim();
}

export function downloadInvoiceXML(invoice: FiscalInvoice) {
  const xmlContent = generateInvoiceXML(invoice);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Factura_${invoice.series}-${invoice.folio}_${invoice.receiver.taxId}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
