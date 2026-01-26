import { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Camera, Upload, Sparkles, Sun, Moon, Monitor, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Footer } from '@/components/layout/Footer';
import { IntelliVoxLogo } from '@/components/brand/IntelliVoxLogo';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Languages with full voice support
const FULL_VOICE_SUPPORT = ['en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU', 'nl-NL', 'pl-PL', 'tr-TR'];

const VOICE_LANGUAGES = [
  { value: 'en-US', label: 'English (US)', fullSupport: true },
  { value: 'en-GB', label: 'English (UK)', fullSupport: true },
  { value: 'hi-IN', label: 'Hindi (हिंदी)', fullSupport: false },
  { value: 'ta-IN', label: 'Tamil (தமிழ்)', fullSupport: false },
  { value: 'te-IN', label: 'Telugu (తెలుగు)', fullSupport: false },
  { value: 'es-ES', label: 'Spanish (Spain)', fullSupport: true },
  { value: 'es-MX', label: 'Spanish (Mexico)', fullSupport: true },
  { value: 'fr-FR', label: 'French', fullSupport: true },
  { value: 'de-DE', label: 'German', fullSupport: true },
  { value: 'it-IT', label: 'Italian', fullSupport: true },
  { value: 'pt-BR', label: 'Portuguese (Brazil)', fullSupport: true },
  { value: 'ja-JP', label: 'Japanese (日本語)', fullSupport: true },
  { value: 'ko-KR', label: 'Korean (한국어)', fullSupport: true },
  { value: 'zh-CN', label: 'Chinese (中文)', fullSupport: true },
  { value: 'ar-SA', label: 'Arabic (العربية)', fullSupport: false },
  { value: 'ru-RU', label: 'Russian (Русский)', fullSupport: true },
  { value: 'nl-NL', label: 'Dutch', fullSupport: true },
  { value: 'pl-PL', label: 'Polish', fullSupport: true },
  { value: 'tr-TR', label: 'Turkish', fullSupport: true },
  { value: 'vi-VN', label: 'Vietnamese', fullSupport: false },
  { value: 'th-TH', label: 'Thai', fullSupport: false },
  { value: 'id-ID', label: 'Indonesian', fullSupport: false },
  { value: 'bn-IN', label: 'Bengali (বাংলা)', fullSupport: false },
  { value: 'gu-IN', label: 'Gujarati (ગુજરાતી)', fullSupport: false },
  { value: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)', fullSupport: false },
  { value: 'ml-IN', label: 'Malayalam (മലയാളം)', fullSupport: false },
  { value: 'mr-IN', label: 'Marathi (मराठी)', fullSupport: false },
  { value: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)', fullSupport: false },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { settings, loading: settingsLoading, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const { profile, loading: profileLoading, updateProfile, uploadAvatar, initials } = useProfile();

  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Languages that support male voice
  const MALE_VOICE_SUPPORTED = ['en-US', 'en-GB', 'es-ES', 'es-MX', 'tr-TR'];
  const isMaleSupported = MALE_VOICE_SUPPORTED.includes(settings.voice_language);

  // Check if selected language has full voice support
  const selectedLang = VOICE_LANGUAGES.find(l => l.value === settings.voice_language);
  const hasFullVoiceSupport = selectedLang?.fullSupport ?? false;

  useEffect(() => {
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
  }, [profile]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleUpdateSetting = async <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    try {
      await updateSettings({ [key]: value });
      toast.success('Setting updated');
    } catch {
      toast.error('Failed to update setting');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ first_name: firstName, last_name: lastName });
      toast.success('Profile saved');
    } catch {
      toast.error('Failed to save profile');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const avatarUrl = await uploadAvatar(file, (progress) => {
        setUploadProgress(progress);
      });
      if (avatarUrl) {
        await updateProfile({ avatar_url: avatarUrl });
        toast.success('Avatar updated');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
      // Clear preview on error
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Don't clear previewUrl here immediately, let it persist until profile update overwrites it 
      // or let it stay until component unmounts/updates. 
      // Actually, once updateProfile connects, profile.avatar_url will update.
      // But clearing it safely is fine as profile.avatar_url should be the new one.
      setPreviewUrl(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getSpeedLabel = (speed: number) => {
    if (speed <= 0.7) return 'Slow';
    if (speed <= 1.2) return 'Normal';
    return 'Fast';
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 p-4 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={() => navigate('/chat')} className="hover:bg-primary/10 rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <IntelliVoxLogo size="sm" />
          <h1 className="text-xl font-bold gradient-text">Settings</h1>
        </button>
      </header>

      <div className="flex-1 max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-20 w-full">
        {/* Profile Settings */}
        <Card className="glass border-border/50 overflow-hidden shadow-xl animate-fade-in-up">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/5 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>
              Personalize your IntelliVox experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <ProfileAvatar
                  src={previewUrl || profile.avatar_url}
                  initials={initials}
                  size="xl"
                  className="ring-4 ring-primary/20"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-6 w-6 text-white animate-spin mb-1" />
                      <span className="text-xs text-white font-medium">{uploadProgress}%</span>
                    </>
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2 rounded-xl"
              >
                <Upload className="h-4 w-4" />
                Upload Photo
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP. Max 5MB.</p>
            </div>

            <Separator />

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="bg-input/50 rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="bg-input/50 rounded-xl h-11"
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="w-full h-11 rounded-xl font-medium">
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="glass border-border/50 shadow-xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of IntelliVox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Selector */}
            <div className="space-y-3">
              <Label className="text-base">Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all btn-press',
                    theme === 'light'
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border hover:border-primary/50 bg-card'
                  )}
                >
                  <Sun className={cn('h-6 w-6', theme === 'light' ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', theme === 'light' ? 'text-primary' : 'text-muted-foreground')}>
                    Light
                  </span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all btn-press',
                    theme === 'dark'
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border hover:border-primary/50 bg-card'
                  )}
                >
                  <Moon className={cn('h-6 w-6', theme === 'dark' ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-primary' : 'text-muted-foreground')}>
                    Dark
                  </span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all btn-press',
                    theme === 'system'
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border hover:border-primary/50 bg-card'
                  )}
                >
                  <Monitor className={cn('h-6 w-6', theme === 'system' ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', theme === 'system' ? 'text-primary' : 'text-muted-foreground')}>
                    System
                  </span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Settings */}
        <Card className="glass border-border/50 shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle>Voice Settings</CardTitle>
            <CardDescription>
              Customize how IntelliVox speaks and listens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Gender */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Voice Gender</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose the AI voice type
                  </p>
                </div>
                <Select
                  value={isMaleSupported ? settings.voice_gender : 'female'}
                  onValueChange={(value: 'male' | 'female') =>
                    handleUpdateSetting('voice_gender', value)
                  }
                  disabled={!isMaleSupported && settings.voice_gender === 'male'}
                >
                  <SelectTrigger className="w-32 bg-input/50 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem
                      value="male"
                      disabled={!isMaleSupported}
                    >
                      Male {!isMaleSupported && '(Not available)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Male voice availability notice */}
              {!isMaleSupported && (
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Male voice is currently available only for English (US/UK), Spanish (Spain/Mexico), and Turkish. Other languages use the standard voice profile.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Voice Speed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Voice Speed</Label>
                  <p className="text-sm text-muted-foreground">
                    Adjust how fast the AI speaks
                  </p>
                </div>
                <span className="text-sm font-medium text-primary px-3 py-1 bg-primary/10 rounded-full">
                  {getSpeedLabel(settings.voice_speed)}
                </span>
              </div>
              <div className="px-1">
                <Slider
                  value={[settings.voice_speed]}
                  onValueChange={([value]) => handleUpdateSetting('voice_speed', value)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>


            {/* Voice Language */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Voice Language</Label>
                  <p className="text-sm text-muted-foreground">
                    AI will respond AND speak in this language
                  </p>
                </div>
                <Select
                  value={settings.voice_language}
                  onValueChange={(value) =>
                    handleUpdateSetting('voice_language', value)
                  }
                >
                  <SelectTrigger className="w-56 bg-input/50 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {VOICE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <div className="flex items-center gap-2">
                          <span>{lang.label}</span>
                          {lang.fullSupport ? (
                            <CheckCircle2 className="h-3 w-3 text-success" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-warning" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Support Notice */}
              <div className={cn(
                'p-3 rounded-xl flex items-start gap-3 animate-fade-in',
                hasFullVoiceSupport
                  ? 'bg-success/10 border border-success/20'
                  : 'bg-warning/10 border border-warning/20'
              )}>
                {hasFullVoiceSupport ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-success">Full Voice Support</p>
                      <p className="text-muted-foreground">
                        This language is fully supported with text and voice input/output.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning">Limited Voice Support</p>
                      <p className="text-muted-foreground">
                        For this language, the assistant can recognize and respond in text.
                        Voice output may be limited. Full voice support may be added in future updates.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Auto Speak */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Auto-Speak Responses</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically speak AI responses in chat
                </p>
              </div>
              <Switch
                checked={settings.auto_speak}
                onCheckedChange={(checked) =>
                  handleUpdateSetting('auto_speak', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="glass border-border/50 shadow-xl animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/30">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="font-medium">{user.email}</p>
            </div>

            <Separator />

            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="w-full h-11 rounded-xl font-medium"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
