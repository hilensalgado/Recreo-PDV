import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  PackagePlus,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportProductsModalProps {
  onImportSuccess: (items: any[]) => Promise<void>;
  onClose: () => void;
}

export interface ParsedProductRow {
  Codigo: string;
  Descripcion: string;
  'Precio Costo': number;
  'Precio Venta': number;
  'Precio Mayoreo': number;
  Inventario: number;
  'Inv. Minimo': number;
  Departamento: string;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  onImportSuccess,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number; created: number; updated: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg(null);
    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse JSON array of objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setErrorMsg('El archivo Excel / CSV seleccionado está vacío o no contiene filas.');
          setParsedRows([]);
          setIsLoading(false);
          return;
        }

        // Map and normalize row fields matching requested columns
        const mappedRows: ParsedProductRow[] = rawJson
          .map((row) => {
            const codigo = String(
              row['Codigo'] || row['Código'] || row['codigo'] || row['barcode'] || ''
            ).trim();

            const descripcion = String(
              row['Descripcion'] ||
                row['Descripción'] ||
                row['descripcion'] ||
                row['Nombre'] ||
                row['name'] ||
                ''
            ).trim();

            const costPrice =
              parseFloat(
                row['Precio Costo'] ?? row['Precio costo'] ?? row['Costo'] ?? row['costo'] ?? 0
              ) || 0;

            const salePrice =
              parseFloat(
                row['Precio Venta'] ?? row['Precio venta'] ?? row['Venta'] ?? row['precio'] ?? 0
              ) || 0;

            const wholesalePrice =
              parseFloat(
                row['Precio Mayoreo'] ?? row['Precio mayoreo'] ?? row['Mayoreo'] ?? salePrice
              ) || salePrice;

            const stock =
              parseFloat(
                row['Inventario'] ?? row['inventario'] ?? row['Stock'] ?? row['stock'] ?? 0
              ) || 0;

            const minStock =
              parseFloat(
                row['Inv. Minimo'] ??
                  row['Inv. Mínimo'] ??
                  row['Inv Minimo'] ??
                  row['Stock Mínimo'] ??
                  5
              ) || 5;

            const departamento = String(
              row['Departamento'] || row['departamento'] || row['Categoría'] || 'Abarrotes'
            ).trim();

            return {
              Codigo: codigo,
              Descripcion: descripcion,
              'Precio Costo': costPrice,
              'Precio Venta': salePrice,
              'Precio Mayoreo': wholesalePrice,
              Inventario: stock,
              'Inv. Minimo': minStock,
              Departamento: departamento,
            };
          })
          .filter((row) => row.Descripcion !== '');

        if (mappedRows.length === 0) {
          setErrorMsg(
            'No se encontraron productos válidos. Verifica que el archivo contenga al menos la columna "Descripcion".'
          );
        } else {
          setParsedRows(mappedRows);
        }
      } catch (err: any) {
        setErrorMsg(`Error al procesar el archivo Excel: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('No se pudo leer el archivo seleccionado.');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDownloadTemplate = () => {
    // Generate Sample Template with exact requested columns
    const sampleData = [
      {
        Codigo: '7790001001',
        Descripcion: 'Coca Cola 2.25L Retornable',
        'Precio Costo': 1800,
        'Precio Venta': 2600,
        'Precio Mayoreo': 2350,
        Inventario: 48,
        'Inv. Minimo': 10,
        Departamento: 'Bebidas y Vinos',
      },
      {
        Codigo: '7790001002',
        Descripcion: 'Yerba Mate Playadito 500g',
        'Precio Costo': 1500,
        'Precio Venta': 2200,
        'Precio Mayoreo': 2000,
        Inventario: 30,
        'Inv. Minimo': 8,
        Departamento: 'Abarrotes',
      },
      {
        Codigo: '7790001003',
        Descripcion: 'Leche Entera 1L',
        'Precio Costo': 900,
        'Precio Venta': 1300,
        'Precio Mayoreo': 1180,
        Inventario: 24,
        'Inv. Minimo': 6,
        Departamento: 'Lácteos y Embutidos',
      },
      {
        Codigo: '7790001004',
        Descripcion: 'Pan Lactal Blanco 500g',
        'Precio Costo': 1200,
        'Precio Venta': 1800,
        'Precio Mayoreo': 1600,
        Inventario: 20,
        'Inv. Minimo': 5,
        Departamento: 'Panadería y Tortillas',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Inventario');
    XLSX.writeFile(workbook, 'Plantilla_Importar_Inventario_Recreo.xlsx');
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await onImportSuccess(parsedRows);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(`Error durante la importación: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#1e293b] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-100">
                Importación Masiva de Productos desde Excel / CSV
              </h2>
              <p className="text-xs text-slate-400">
                Carga tu catálogo completo de inventario de forma rápida y automatizada
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Instructions Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="space-y-1 max-w-xl">
              <span className="font-extrabold uppercase tracking-wider block text-emerald-800">
                📌 Columnas Requeridas en tu Excel:
              </span>
              <p className="font-mono text-[11px] bg-white/80 p-2 rounded border border-emerald-200 font-bold">
                Codigo | Descripcion | Precio Costo | Precio Venta | Precio Mayoreo | Inventario | Inv. Minimo | Departamento
              </p>
              <p className="text-[11px] text-emerald-700">
                * Si un producto posee un código existente en el inventario, sus datos se actualizarán automáticamente.
              </p>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Excel Ejemplo</span>
            </button>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, .tsv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-12 h-12 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-200 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <span className="font-extrabold text-sm text-slate-800 block">
                {file ? file.name : 'Haz clic aquí para seleccionar tu archivo Excel o CSV'}
              </span>
              <span className="text-xs text-slate-500">
                Formatos soportados: .xlsx, .xls, .csv, .tsv
              </span>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-sm font-extrabold">¡Importación completada con éxito!</h4>
                <p className="text-xs text-emerald-800">
                  Los productos han sido registrados e integrados en el inventario.
                </p>
              </div>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && !isSuccess && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-emerald-600" />
                  <span>Vista Previa de Productos a Importar ({parsedRows.length} filas detectadas)</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                  Listo para Procesar
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl shadow-inner divide-y divide-slate-100 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 text-[11px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Descripción</th>
                      <th className="p-2.5 text-right">Costo ($ ARS)</th>
                      <th className="p-2.5 text-right">Venta ($ ARS)</th>
                      <th className="p-2.5 text-right">Mayoreo ($ ARS)</th>
                      <th className="p-2.5 text-center">Stock</th>
                      <th className="p-2.5 text-center">Min. Stock</th>
                      <th className="p-2.5">Departamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-medium">
                        <td className="p-2.5 font-mono text-slate-600 font-bold">{row.Codigo || 'Autogenerado'}</td>
                        <td className="p-2.5 font-bold text-slate-800">{row.Descripcion}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">${row['Precio Costo'].toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono font-black text-emerald-700">${row['Precio Venta'].toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono text-blue-700">${row['Precio Mayoreo'].toFixed(2)}</td>
                        <td className="p-2.5 text-center font-bold text-slate-900">{row.Inventario}</td>
                        <td className="p-2.5 text-center text-slate-500">{row['Inv. Minimo']}</td>
                        <td className="p-2.5">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {row.Departamento}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[10px] text-slate-500 italic text-right">
                  * Mostrando las primeras 50 filas de {parsedRows.length} encontradas.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            {isSuccess ? 'Cerrar' : 'Cancelar'}
          </button>

          {!isSuccess && (
            <button
              onClick={handleConfirmImport}
              disabled={parsedRows.length === 0 || isLoading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando Importación...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Importar {parsedRows.length} Productos</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
