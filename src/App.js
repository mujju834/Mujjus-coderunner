import React, { useState, useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaPlay, FaCircleNotch, FaPaste } from 'react-icons/fa';
import './App.css';  // Ensure CSS is linked correctly for spinner animation

const App = () => {
  const [output, setOutput] = useState("");   // For text output
  const [loading, setLoading] = useState(false);   // For showing spinner during execution
  const [plot, setPlot] = useState(null);   // For storing plot image if generated
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);   // Reference for Monaco editor instance
  const hiddenTextAreaRef = useRef(null);   // Ref for hidden textarea (for mobile paste functionality)

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (!editorInstanceRef.current) {
      editorInstanceRef.current = monaco.editor.create(editorRef.current, {
        value: `# Write Python code here\nprint("Hello, World!")`,
        language: 'python',
        theme: 'vs', // Use a lighter theme
        automaticLayout: false, // Disable automatic layout
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        contextmenu: !isMobile, // Disable Monaco's custom context menu on mobile
      });

      // Manually resize the editor after a delay
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          if (editorInstanceRef.current) {
            editorInstanceRef.current.layout(); // Manually call layout after a delay
          }
        }, 100); // Throttling the resize updates
      });

      resizeObserver.observe(editorRef.current);

      // Clean up observer on component unmount
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  const handleRunClick = async () => {
    setLoading(true); // Set loading state to true when run is clicked
    setPlot(null); // Reset plot state for new code execution

    const codeToRun = editorInstanceRef.current.getValue();

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/run-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: codeToRun }),
      });

      const data = await response.json();
      console.log("Response Data:", data);  // Add this to see the response in the console
      setOutput(data.output);   // Set text output
      if (data.plot) {
        setPlot(data.plot);   // Set plot if present
      } else {
        setPlot(null);   // Reset plot if no plot was generated
      }
    } catch (error) {
      setOutput('Error executing code');
    } finally {
      setLoading(false);   // Set loading state back to false once execution completes
    }
  };

  // Handle Paste functionality with hidden textarea for mobile
  const handlePasteClick = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && hiddenTextAreaRef.current) {
      // On mobile, we use a hidden textarea to access the clipboard
      hiddenTextAreaRef.current.value = '';
      hiddenTextAreaRef.current.focus();
      document.execCommand('paste');
      setTimeout(() => {
        const pastedText = hiddenTextAreaRef.current.value;
        if (pastedText) {
          const currentCode = editorInstanceRef.current.getValue();
          editorInstanceRef.current.setValue(currentCode + pastedText);
        }
      }, 100); // Small delay to allow paste operation
    } else {
      // For desktop use clipboard API
      navigator.clipboard.readText().then((clipboardText) => {
        const currentCode = editorInstanceRef.current.getValue();
        editorInstanceRef.current.setValue(currentCode + clipboardText);
      }).catch(() => {
        alert('Clipboard paste is not supported in this browser');
      });
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Mujju's Python-Code-Runner</h1>

      <div className="card shadow">
        <div className="card-body" style={{ backgroundColor: '#f5f5f5', position: 'relative' }}>
          {/* Editor container with fixed height and scrolling */}
          <div
            ref={editorRef}
            style={{ height: '400px', overflowY: 'auto', width: '100%', border: '1px solid #ddd' }}   // Enable scroll for content beyond 400px
          ></div>

          {/* Hidden TextArea for handling paste on mobile */}
          <textarea
            ref={hiddenTextAreaRef}
            style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}
            aria-hidden="true"
          ></textarea>

          {/* Paste button on the top-right corner */}
          <button
            className="btn btn-secondary paste-btn"
            onClick={handlePasteClick}
            style={{ position: 'absolute', top: '10px', right: '10px' }}
            title="Paste from clipboard"
          >
            <FaPaste /> Paste
          </button>

          <button
            onClick={handleRunClick}
            className="btn btn-primary mt-3"
            style={{ float: 'right' }}
            disabled={loading} // Disable button during loading state
          >
            {loading ? (
              <FaCircleNotch className="spinner rotating-spinner" /> // Show spinner with custom class
            ) : (
              <FaPlay /> // Show play icon when not loading
            )}
          </button>
        </div>
      </div>

      <div className="card mt-4 shadow">
        <div className="card-header">Output</div>
        <div className="card-body">
          <pre>{output}</pre>   {/* Display the output */}
          {plot && (
            <img src={`data:image/png;base64,${plot}`} alt="Generated Plot" style={{ maxWidth: '100%' }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
