import re

with open('src/components/UnifiedSettingsDashboard.tsx', 'r') as f:
    content = f.read()

# Fix the renderIcon function which uses LucideIcons dynamically
replacement = """
  // Helper to render icon dynamically
  const renderIcon = (name: string, size = 15, className = "") => {
    // Disable dynamic lucide icon rendering to prevent illegal constructor in some environments
    // Fallback to static icons for the known ones in settings tabs
    if (name === "Palette") return <LucideIcons.Palette size={size} className={className} />;
    if (name === "LayoutDashboard") return <LucideIcons.LayoutDashboard size={size} className={className} />;
    if (name === "Image") return <LucideIcons.Image size={size} className={className} />;
    if (name === "Shield") return <LucideIcons.Shield size={size} className={className} />;
    if (name === "Key") return <LucideIcons.Key size={size} className={className} />;
    if (name === "Database") return <LucideIcons.Database size={size} className={className} />;
    if (name === "Sliders") return <LucideIcons.Sliders size={size} className={className} />;
    if (name === "DollarSign") return <LucideIcons.DollarSign size={size} className={className} />;
    if (name === "MonitorPlay") return <LucideIcons.MonitorPlay size={size} className={className} />;
    if (name === "CreditCard") return <LucideIcons.CreditCard size={size} className={className} />;
    if (name === "Zap") return <LucideIcons.Zap size={size} className={className} />;
    
    return <LucideIcons.Settings size={size} className={className} />;
  };
"""

content = re.sub(r'// Helper to render icon dynamically.*?return Component \? <Component size=\{size\} className=\{className\} /> : null;\n  };', replacement.strip(), content, flags=re.DOTALL)

with open('src/components/UnifiedSettingsDashboard.tsx', 'w') as f:
    f.write(content)
