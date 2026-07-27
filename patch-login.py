import re

with open('src/components/Login.tsx', 'r') as f:
    content = f.read()

# Find the start of the return statement
return_start = content.find('  return (\n    <div className="w-full max-w-md mx-auto" id="login-container">')

if return_start == -1:
    print("Could not find return statement")
    exit(1)

# The content before the return
before_return = content[:return_start]

# The return content
return_content = content[return_start + 11:] # skip '  return (\n'

# We want to change it to:
# const loginFormContent = ( ... );
# return renderTheme(loginTheme, loginFormContent);

# We need to find the matching closing brace for the return statement, which is at the end of the file.
# The file ends with:
#     </div>
#   );
# }

new_return_content = "  const loginFormContent = (\n" + return_content.replace('  );\n}', '  );\n\n')

theme_renderer = """
  const theme = liveCustomization?.loginTheme || 'default';
  
  // Theme Backgrounds
  switch(theme) {
    case 'glass-blue':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)" }}>
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[100px]"></div>
          </div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'dark-minimal':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ backgroundColor: "#000000" }}>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'neon-mobile':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg bg-pink-500/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'split-testimonial':
      return (
        <div className="min-h-screen w-full flex bg-slate-50">
          <div className="hidden lg:flex w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden text-white">
            <div className="absolute inset-0 bg-cyan-500/10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            <div className="z-10">
              <h1 className="text-4xl font-bold mb-4 font-display">{liveCustomization?.title || "Enterprise Portal"}</h1>
              <p className="text-cyan-400 text-xl max-w-md">{liveCustomization?.subtitle || "Access the cooperative ecosystem."}</p>
            </div>
            <div className="z-10">
              <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <p className="italic mb-4">"The absolute best management system we have ever used for our hostel operations."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-bold">SA</div>
                  <div>
                    <div className="font-bold">System Admin</div>
                    <div className="text-xs text-slate-300">Cooperative Board</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
            {loginFormContent}
          </div>
        </div>
      );
    case 'split-image':
      return (
        <div className="min-h-screen w-full flex bg-slate-950">
          <div className="hidden lg:block w-1/2 relative bg-slate-900">
            <img src={liveCustomization?.backgroundImageUrl || "https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop"} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity" alt="Background" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
            <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
              <h1 className="text-5xl font-bold mb-4">{liveCustomization?.title || "Enterprise"}</h1>
              <p className="text-xl text-slate-300">{liveCustomization?.subtitle || "Welcome back"}</p>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm lg:hidden z-0"></div>
            <div className="z-10 relative">{loginFormContent}</div>
          </div>
        </div>
      );
    case 'aurora':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-500/20 blur-[120px] animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: "2s" }}></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'cyberpunk':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950" style={{ backgroundImage: "radial-gradient(circle at center, #022c22 0%, #020617 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #10b981 2px, #10b981 4px)", backgroundSize: "100% 4px" }}></div>
          <div className="z-10 relative border-l-4 border-emerald-500 pl-4">{loginFormContent}</div>
        </div>
      );
    case 'crimson-velvet':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950" style={{ background: "linear-gradient(135deg, #2e020f 0%, #000000 100%)" }}>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'forest-glow':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950" style={{ background: "linear-gradient(to bottom, #064e3b 0%, #020617 100%)" }}>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'ocean-waves':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-sky-900/20" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath fill=%22%230284c7%22 fill-opacity=%220.05%22 d=%22M45.7,-76.4C58.9,-69.3,69.1,-56,76.5,-41.5C83.9,-27,88.5,-11.3,87,-4.3C85.5,2.7,77.9,10,72.4,18.7C66.9,27.4,63.5,37.5,56.7,45.4C49.9,53.3,39.7,59,28.8,63.3C17.9,67.6,6.3,70.5,-5.5,70.5C-17.3,70.5,-29.3,67.6,-38.7,60.8C-48.1,54,-54.9,43.3,-62.4,32.3C-69.9,21.3,-78.1,10.6,-80.4,-1.3C-82.7,-13.2,-79.1,-26.4,-71.5,-36.8C-63.9,-47.2,-52.3,-54.8,-39.9,-62.2C-27.5,-69.6,-13.8,-76.8,1.4,-78.5C16.6,-80.2,32.5,-83.5,45.7,-76.4Z%22 transform=%22translate(100 100)%22 /%3E%3C/svg%3E')", backgroundSize: "cover", backgroundPosition: "center" }}></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'monochrome-elegant':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-neutral-900">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
          <div className="z-10 relative grayscale">{loginFormContent}</div>
        </div>
      );
    case 'sunset-gradient':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-rose-600/10 to-purple-900/40"></div>
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'holographic':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="z-10 relative backdrop-blur-xl bg-white/5 p-2 rounded-3xl border border-white/10 shadow-2xl">{loginFormContent}</div>
        </div>
      );
    case 'abstract-shapes':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-500/30 rounded-lg rotate-12 blur-xl animate-pulse"></div>
          <div className="absolute bottom-10 right-20 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }}></div>
          <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-blue-500/20 rotate-45 blur-lg animate-pulse" style={{ animationDelay: "2s" }}></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'particles':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle, #38bdf8 1px, transparent 1px)", backgroundSize: "30px 30px", backgroundPosition: "0 0, 15px 15px" }}></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'default':
    default:
      return (
        <div className={`min-h-screen w-full transition-all flex items-center justify-center p-4 relative ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
          {/* Glow backgrounds for default theme */}
          <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-radial-gradient opacity-20 animate-pulse pointer-events-none"></div>
          <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-radial-gradient opacity-25 animate-pulse pointer-events-none"></div>
          
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
  }
}
"""

with open('src/components/Login.tsx', 'w') as f:
    f.write(before_return + new_return_content + theme_renderer)
