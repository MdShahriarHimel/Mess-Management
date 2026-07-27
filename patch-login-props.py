import re

with open('src/components/Login.tsx', 'r') as f:
    content = f.read()

pattern = r'''(  customization\?: \{\s+title: string;\s+subtitle: string;\s+fontStyle: string;\s+showBrandingIcon: boolean;\s+showGoogleLogin: boolean;\s+cardBg\?: string;\s+textColor\?: string;\s+accentColor\?: string;\s+animationType\?: string;\s+logoType\?: string;\s+customLogoUrl\?: string;\s+\};)'''

replacement = r'''  customization?: {
    title: string;
    subtitle: string;
    fontStyle: string;
    showBrandingIcon: boolean;
    showGoogleLogin: boolean;
    cardBg?: string;
    textColor?: string;
    accentColor?: string;
    animationType?: string;
    logoType?: string;
    customLogoUrl?: string;
    loginTheme?: string;
    titleFontSize?: string;
    subtitleFontSize?: string;
    buttonTextLogin?: string;
    backgroundImageUrl?: string;
  };'''

content = re.sub(pattern, replacement, content)

with open('src/components/Login.tsx', 'w') as f:
    f.write(content)
