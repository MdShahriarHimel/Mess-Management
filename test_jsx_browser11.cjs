const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const tags = `AbortController Activity AlertCircle AlertOctagon AlertTriangle Archive ArrowRight AuditLog AutoRefreshContext AutoRefreshContextType Award BackgroundAudioPlayerProps Bell Box Briefcase Building Calendar Check CheckCircle CheckCircle2 CheckSquare ChevronDown ChevronLeft ChevronRight ChevronUp Clock Coffee Coins ColorPalettePicker Component Copy Cpu CreditAndPermissionsProps CreditConfig Database Deposit DollarSign Download Duty Edit Edit2 Edit3 Eye EyeOff FileJson FileSpreadsheet FileText Filter Globe Heart HTMLAudioElement HTMLDivElement HTMLInputElement HTMLSelectElement IconComponent Info Key KeyRound Loader2 Lock LoginEnginePanel LucideIcons Mail MarketEntry Member MenuType MessOption MicroAnimationOverlay MonetizationHub MonitorPlay Moon Notice Palette Phone PieChart Pin Pipette Plus Printer React Record RefreshButton RefreshButtonProps RefreshCw RefreshModule RgbColorPicker RotateCcw Save Search Settings Settings2 Shield ShieldAlert ShoppingCart Sliders Sparkles Square Star Sun Terminal ThemeEnginePanel ThemeEnginePanelProps ThemeTemplate ToggleLeft ToggleRight Trash2 TrendingUp Trophy Type UnifiedSettingsDashboardProps Unlock Upload User UserCheck UserMinus UserPlus UserRole Users Vote X`.split(' ');
  
  const result = await page.evaluate((tags) => {
    let illegal = [];
    for (let t of tags) {
      if (typeof window[t] === 'function') {
        try {
          window[t]();
        } catch(e) {
          if (e.message === 'Illegal constructor') {
            illegal.push(t);
          }
        }
      }
    }
    return illegal;
  }, tags);
  console.log("ILLEGAL:", result);
  await browser.close();
})();
