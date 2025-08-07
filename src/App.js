// ===== src/App.js =====
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, Square, Wand2, Save, AlertCircle, Check, X } from 'lucide-react';

const PDFRedactionTool = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [redactions, setRedactions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [redactionMode, setRedactionMode] = useState(false);
  
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const startPoint = useRef({ x: 0, y: 0 });

  // Initialize PDF.js
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, []);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a valid PDF file.');
      return;
    }
    
    setPdfFile(file);
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setRedactions([]);
      setSuggestions([]);
      
      // Auto-detect sensitive information
      await detectSensitiveInfo(arrayBuffer);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate NLP detection of sensitive information
  const detectSensitiveInfo = async (arrayBuffer) => {
    setIsProcessing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock sensitive data detection
    const mockSuggestions = [
      { id: 1, page: 1, x: 100, y: 200, width: 120, height: 20, type: 'email', text: 'john@example.com', confidence: 0.95 },
      { id: 2, page: 1, x: 150, y: 300, width: 100, height: 20, type: 'phone', text: '(555) 123-4567', confidence: 0.88 },
      { id: 3, page: 1, x: 200, y: 400, width: 80, height: 20, type: 'name', text: 'John Smith', confidence: 0.92 },
      { id: 4, page: 2, x: 120, y: 250, width: 110, height: 20, type: 'ssn', text: '123-45-6789', confidence: 0.98 },
    ];
    
    setSuggestions(mockSuggestions);
    setShowSuggestions(true);
    setIsProcessing(false);
  };

  // Render PDF page
  const renderPage = async (pageNum) => {
    if (!pdfDoc) return;
    
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    const canvas = pdfCanvasRef.current;
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Set up overlay canvas for redactions
    const overlayCanvas = overlayCanvasRef.current;
    overlayCanvas.height = viewport.height;
    overlayCanvas.width = viewport.width;
    
    // Redraw existing redactions for current page
    redrawRedactions();
  };

  // Redraw all redactions on current page
  const redrawRedactions = () => {
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw confirmed redactions
    redactions
      .filter(r => r.page === currentPage)
      .forEach(redaction => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(redaction.x, redaction.y, redaction.width, redaction.height);
      });
    
    // Draw suggestions if visible
    if (showSuggestions) {
      suggestions
        .filter(s => s.page === currentPage)
        .forEach(suggestion => {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.fillRect(suggestion.x, suggestion.y, suggestion.width, suggestion.height);
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.strokeRect(suggestion.x, suggestion.y, suggestion.width, suggestion.height);
        });
    }
  };

  // Handle mouse events for manual redaction
  const handleMouseDown = (e) => {
    if (!redactionMode || !overlayCanvasRef.current) return;
    
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    startPoint.current = { x, y };
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !overlayCanvasRef.current) return;
    
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = overlayCanvasRef.current.getContext('2d');
    redrawRedactions();
    
    // Draw current selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      Math.min(startPoint.current.x, x),
      Math.min(startPoint.current.y, y),
      Math.abs(x - startPoint.current.x),
      Math.abs(y - startPoint.current.y)
    );
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const width = Math.abs(x - startPoint.current.x);
    const height = Math.abs(y - startPoint.current.y);
    
    if (width > 5 && height > 5) {
      const newRedaction = {
        id: Date.now(),
        page: currentPage,
        x: Math.min(startPoint.current.x, x),
        y: Math.min(startPoint.current.y, y),
        width,
        height,
        type: 'manual'
      };
      
      setRedactions(prev => [...prev, newRedaction]);
    }
    
    setIsDrawing(false);
  };

  // Accept suggestion
  const acceptSuggestion = (suggestion) => {
    const newRedaction = {
      id: Date.now(),
      page: suggestion.page,
      x: suggestion.x,
      y: suggestion.y,
      width: suggestion.width,
      height: suggestion.height,
      type: suggestion.type
    };
    
    setRedactions(prev => [...prev, newRedaction]);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  // Reject suggestion
  const rejectSuggestion = (suggestionId) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  // Navigate pages
  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  // Export redacted PDF (simulated)
  const exportRedactedPDF = async () => {
    setIsProcessing(true);
    
    // Simulate PDF processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // In a real implementation, this would:
    // 1. Send redactions to backend
    // 2. Backend processes PDF with PyMuPDF
    // 3. Returns processed PDF blob
    
    // Mock download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfFile);
    link.download = 'redacted_' + (pdfFile?.name || 'document.pdf');
    link.click();
    
    setIsProcessing(false);
    alert('Redacted PDF exported successfully!');
  };

  // Re-render page when scale or page changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale]);

  // Redraw redactions when they change
  useEffect(() => {
    if (overlayCanvasRef.current) {
      redrawRedactions();
    }
  }, [redactions, suggestions, showSuggestions, currentPage]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">PDF Redaction Tool</h1>
        
        {/* Upload Section */}
        {!pdfFile && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload PDF Document</h3>
            <p className="text-gray-500 mb-4">Select a PDF file to begin redaction process</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer font-medium"
            >
              <Upload className="h-5 w-5 mr-2" />
              Choose PDF File
            </label>
            <p className="text-xs text-gray-400 mt-2">Maximum file size: 50MB</p>
          </div>
        )}
      </div>

      {/* Main Content */}
      {pdfFile && (
        <div className="flex-1 flex">
          {/* Sidebar */}
          <div className="w-80 bg-white shadow-sm border-r flex flex-col">
            {/* Controls */}
            <div className="p-4 border-b">
              <div className="space-y-4">
                {/* Page Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={zoomOut}
                    className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600 w-16 text-center font-medium">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={zoomIn}
                    className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>

                {/* Redaction Mode Toggle */}
                <button
                  onClick={() => setRedactionMode(!redactionMode)}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-md font-medium ${
                    redactionMode
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Square className="h-4 w-4 mr-2" />
                  {redactionMode ? 'Exit Redaction Mode' : 'Manual Redaction Mode'}
                </button>

                {/* Auto-detect Toggle */}
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-md font-medium ${
                    showSuggestions
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {showSuggestions ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showSuggestions ? 'Hide AI Suggestions' : 'Show AI Suggestions'}
                </button>

                {/* Export Button */}
                <button
                  onClick={exportRedactedPDF}
                  disabled={redactions.length === 0 || isProcessing}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Export Redacted PDF'}
                </button>
              </div>
            </div>

            {/* Suggestions Panel */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                AI Suggestions ({suggestions.length})
              </h3>
              
              {suggestions.length === 0 && (
                <p className="text-gray-500 text-sm">No suggestions found or all reviewed.</p>
              )}
              
              {suggestions.map(suggestion => (
                <div key={suggestion.id} className="bg-gray-50 rounded-lg p-3 mb-3 border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                        {suggestion.type}
                      </span>
                      <p className="text-sm text-gray-600">Page {suggestion.page}</p>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {Math.round(suggestion.confidence * 100)}% confident
                    </div>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-900 mb-3 bg-white p-2 rounded border">
                    "{suggestion.text}"
                  </p>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => acceptSuggestion(suggestion)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-medium"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept
                    </button>
                    <button
                      onClick={() => rejectSuggestion(suggestion.id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-medium"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Redaction Summary */}
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-md font-semibold text-gray-900 mb-2">
                  Applied Redactions ({redactions.length})
                </h4>
                {redactions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No redactions applied yet.</p>
                ) : (
                  redactions.map(redaction => (
                    <div key={redaction.id} className="text-xs text-gray-600 mb-1 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Page {redaction.page}</span> - {redaction.type}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            {isProcessing && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Processing PDF...</p>
                </div>
              </div>
            )}
            
            {pdfDoc && (
              <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                {redactionMode && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-700 font-medium">
                          Redaction mode is active. Click and drag to select areas for redaction.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="relative inline-block">
                  <canvas
                    ref={pdfCanvasRef}
                    className="border max-w-full"
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute top-0 left-0 border max-w-full"
                    style={{ cursor: redactionMode ? 'crosshair' : 'default' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFRedactionTool;