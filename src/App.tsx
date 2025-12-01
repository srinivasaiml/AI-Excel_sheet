import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

// ✅ Keep all your real imports
import { ExcelForm } from './components/ExcelForm';
import { ExcelPreview } from './components/ExcelPreview';
import { ExcelEditor } from './components/ExcelEditor';
import { FileUpload } from './components/FileUpload';
import { ExcelData, ExcelGenerationRequest } from './types/excel';
import { ExcelFile } from './types/excelData';
import { ExcelGeneratorService } from './services/excelGenerator';
import { AIService } from './services/aiService';
import Footer from './components/Footer';

// ✅ Keep ShaderBackground as a reusable component
function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform float u_time;
    uniform vec3 u_resolution;

    #define STEP 256
    #define EPS .001

    float smin(float a, float b, float k) {
        float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
        return mix(b, a, h) - k*h*(1.0-h);
    }

    const mat2 m = mat2(.8,.6,-.6,.8);

    float noise(in vec2 x) {
      return sin(1.5*x.x)*sin(1.5*x.y);
    }

    float fbm6(vec2 p) {
        float f = 0.0;
        f += 0.500000*(0.5+0.5*noise(p)); p = m*p*2.02;
        f += 0.250000*(0.5+0.5*noise(p)); p = m*p*2.03;
        f += 0.125000*(0.5+0.5*noise(p)); p = m*p*2.01;
        f += 0.062500*(0.5+0.5*noise(p)); p = m*p*2.04;
        f += 0.015625*(0.5+0.5*noise(p));
        return f/0.96875;
    }

    mat2 getRot(float a) {
        float sa = sin(a), ca = cos(a);
        return mat2(ca,-sa,sa,ca);
    }

    vec3 _position;

    float sphere(vec3 center, float radius) {
        return distance(_position,center) - radius;
    }

    float swingPlane(float height) {
        vec3 pos = _position + vec3(0.,0.,u_time * 5.5);
        float def = fbm6(pos.xz * .25) * 0.5;
        float way = pow(abs(pos.x) * 34., 2.5) * .0000125;
        def *= way;
        float ch = height + def;
        return max(pos.y - ch, 0.);
    }

    float map(vec3 pos) {
        _position = pos;
        float dist = swingPlane(0.);
        float sminFactor = 5.25;
        dist = smin(dist, sphere(vec3(0.,-15.,80.), 60.), sminFactor);
        return dist;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = (fragCoord.xy - .5*u_resolution.xy) / u_resolution.y;
        vec3 rayOrigin = vec3(uv + vec2(0.,6.), -1.);
        vec3 rayDir = normalize(vec3(uv, 1.));
        rayDir.zy = getRot(.15) * rayDir.zy;
        vec3 position = rayOrigin;
        
        float curDist;
        int nbStep = 0;
        
        for(; nbStep < STEP; ++nbStep) {
            curDist = map(position);
            if(curDist < EPS) break;
            position += rayDir * curDist * .5;
        }
        
        float f = float(nbStep) / float(STEP);
        f *= .9;
        
        vec3 col = vec3(f);
        vec3 colorTint = vec3(0.4, 0.6, 1.0);
        col = mix(col, col * colorTint, 0.5);
        
        fragColor = vec4(col, 1.0);
    }

    void main() {
      vec4 fragColor;
      vec2 fragCoord = vUv * u_resolution.xy;
      mainImage(fragColor, fragCoord);
      gl_FragColor = fragColor;
    }
  `;

  const shaderUniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_resolution: { value: new THREE.Vector3(1, 1, 1) },
  }), []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      alpha: true,
      antialias: false 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: shaderUniforms,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();

    const animate = () => {
      material.uniforms.u_time.value = clock.getElapsedTime() * 0.5;
      material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight, 1.0);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [shaderUniforms, vertexShader, fragmentShader]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />;
}

// ✅ Your original app logic — unchanged except UI styling
type AppMode = 'home' | 'generate' | 'upload';

function App() {
  const [mode, setMode] = useState<AppMode>('home');
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [excelFile, setExcelFile] = useState<ExcelFile | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGenerate = (request: ExcelGenerationRequest) => {
    const data = ExcelGeneratorService.generateExcelData(request);
    setExcelData(data);
  };

  const handleFileLoaded = (file: ExcelFile) => {
    setExcelFile(file);
    setMode('upload');
  };

  const handleProcessWithAI = async (instruction: string) => {
    if (!excelFile) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const currentSheet = excelFile.sheets[excelFile.currentSheetIndex];
      const result = await AIService.transformData({
        operation: instruction,
        headers: currentSheet.headers,
        rows: currentSheet.rows,
      });

      const updatedSheet = {
        ...currentSheet,
        headers: result.headers,
        rows: result.rows,
      };

      const updatedSheets = [...excelFile.sheets];
      updatedSheets[excelFile.currentSheetIndex] = updatedSheet;

      setExcelFile({
        ...excelFile,
        sheets: updatedSheets,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process with AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateExcelFile = (file: ExcelFile) => {
    setExcelFile(file);
  };

  const handleReset = () => {
    setExcelData(null);
    setMode('home');
  };

  const handleResetFile = () => {
    setExcelFile(null);
    setMode('home');
  };

  return (
    <>
      {/* Custom animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 1.2s ease-out forwards;
        }
        .animate-fade-in-up-delay-1 {
          animation: fadeInUp 1.2s ease-out 0.2s forwards;
          opacity: 0;
        }
        .animate-fade-in-up-delay-2 {
          animation: fadeInUp 1.2s ease-out 0.4s forwards;
          opacity: 0;
        }
      `}</style>

      {/* ✨ Animated Background */}
      <div className="fixed inset-0 -z-10">
        <ShaderBackground />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        {/* Vignette effect */}
        <div className="absolute inset-0 [background:radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* ✅ Your working UI with new styling */}
      <div className="min-h-screen relative z-10 p-6">
        {mode === 'home' && (
          <div className={`max-w-5xl mx-auto transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            {/* Hero */}
            <div className="text-center mb-16 pt-20 animate-fade-in-up">
              <div className="inline-block mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 blur-3xl opacity-40 animate-pulse" />
                  <h1 className="relative text-6xl md:text-8xl font-extralight leading-[0.95] tracking-tight bg-gradient-to-r from-white via-cyan-100 to-blue-100 bg-clip-text text-transparent drop-shadow-2xl">
                    AI Excel Assistant
                  </h1>
                </div>
              </div>
              <p className="text-xl md:text-2xl text-white/90 font-light max-w-3xl mx-auto leading-relaxed animate-fade-in-up-delay-1">
                Create, edit, and transform Excel files with{' '}
                <span className="font-medium text-cyan-300">AI-powered intelligence</span>
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-fade-in-up-delay-2">
              <button
                onClick={() => setMode('generate')}
                className="group relative p-12 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 hover:border-cyan-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/0 via-blue-400/0 to-purple-400/0 group-hover:from-cyan-400/10 group-hover:via-blue-400/5 group-hover:to-transparent transition-all duration-700" />
                <div className="relative">
                  <div className="text-7xl mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 filter drop-shadow-2xl">
                    📝
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Create New Excel</h2>
                  <p className="text-white/80 text-lg leading-relaxed">
                    Generate a new Excel file from scratch with AI assistance
                  </p>
                  <div className="absolute top-6 right-6 w-24 h-24 border-t-2 border-r-2 border-cyan-400/40 rounded-tr-3xl transform group-hover:scale-125 group-hover:border-cyan-400/60 transition-all duration-500" />
                </div>
              </button>

              <button
                onClick={() => setMode('upload')}
                className="group relative p-12 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 hover:border-purple-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/0 via-pink-400/0 to-purple-400/0 group-hover:from-purple-400/10 group-hover:via-pink-400/5 group-hover:to-transparent transition-all duration-700" />
                <div className="relative">
                  <div className="text-7xl mb-6 transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 filter drop-shadow-2xl">
                    📂
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Upload & Edit</h2>
                  <p className="text-white/80 text-lg leading-relaxed">
                    Upload an existing Excel file and edit it with AI
                  </p>
                  <div className="absolute top-6 right-6 w-24 h-24 border-t-2 border-r-2 border-purple-400/40 rounded-tr-3xl transform group-hover:scale-125 group-hover:border-purple-400/60 transition-all duration-500" />
                </div>
              </button>
            </div>

            {/* Feature Pills */}
           
          </div>
        )}

        {/* Generate Mode */}
        {mode === 'generate' && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <button
              onClick={handleReset}
              className="mb-6 px-6 py-3 text-white/90 hover:text-white font-medium bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
            >
              ← Back to Home
            </button>
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
              {!excelData ? (
                <ExcelForm onGenerate={handleGenerate} />
              ) : (
                <ExcelPreview data={excelData} onReset={handleReset} />
              )}
            </div>
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="max-w-5xl mx-auto animate-fade-in-up">
            <button
              onClick={handleResetFile}
              className="mb-6 px-6 py-3 text-white/90 hover:text-white font-medium bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
            >
              ← Back to Home
            </button>

            {!excelFile ? (
              <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
                <FileUpload onFileLoaded={handleFileLoaded} />
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-8 space-y-6">
                {errorMessage && (
                  <div className="p-5 bg-red-500/20 border border-red-400/50 rounded-2xl text-red-100 backdrop-blur-lg animate-fade-in-up">
                    {errorMessage}
                  </div>
                )}
                <ExcelEditor
                  excelFile={excelFile}
                  onUpdate={handleUpdateExcelFile}
                  onProcessWithAI={handleProcessWithAI}
                  isProcessing={isProcessing}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}

export default App;