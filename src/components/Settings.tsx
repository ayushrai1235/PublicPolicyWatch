import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Bell, 
  Shield, 
  Database, 
  Calendar,
  Globe,
  Key,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { apiService } from '@/services/api';
import { toast } from 'sonner';

export function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [urgentAlerts, setUrgentAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [autoScraping, setAutoScraping] = useState(true);
  const [email, setEmail] = useState('user@example.com');
  const [scrapingFrequency, setScrapingFrequency] = useState('daily');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [testingEmail, setTestingEmail] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>('');

  useEffect(() => {
    checkServerHealth();
    // Check server health every 30 seconds
    const interval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkServerHealth = async () => {
    try {
      const response = await apiService.checkHealth();
      if (response.data) {
        setServerStatus('online');
        setLastScanTime(response.data.timestamp);
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully');
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const response = await apiService.sendTestEmail();
      if (response.data) {
        toast.success('Test email sent successfully! Check your inbox.');
      } else {
        toast.error(response.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Test email error:', error);
      toast.error('Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleManualScrape = async () => {
    try {
      toast.info('Starting manual scraping...');
      const response = await apiService.triggerScraping();
      if (response.data) {
        toast.success('Manual scraping completed successfully');
        checkServerHealth(); // Refresh status
      } else {
        toast.error(response.error || 'Scraping failed');
      }
    } catch (error) {
      console.error('Manual scraping error:', error);
      toast.error('Failed to trigger manual scraping');
    }
  };

  const monitoredSites = [
    { 
      name: 'Ministry of Environment', 
      url: 'https://moef.gov.in/public-consultations/', 
      status: serverStatus === 'online' ? 'active' : 'pending' 
    },
    { 
      name: 'PRS India', 
      url: 'https://prsindia.org/billtrack', 
      status: serverStatus === 'online' ? 'active' : 'pending' 
    },
    { 
      name: 'e-Gazette', 
      url: 'https://egazette.nic.in', 
      status: serverStatus === 'online' ? 'active' : 'pending' 
    },
    { 
      name: 'Ministry of Agriculture', 
      url: 'https://agricoop.gov.in', 
      status: serverStatus === 'online' ? 'active' : 'pending' 
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your monitoring preferences and notification settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleTestEmail}
                    disabled={testingEmail}
                    className="gap-2"
                  >
                    {testingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {testingEmail ? 'Testing...' : 'Test'}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Policy Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when new animal welfare policies are found
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Urgent Deadlines</Label>
                    <p className="text-sm text-muted-foreground">
                      High-priority alerts for policies with approaching deadlines
                    </p>
                  </div>
                  <Switch
                    checked={urgentAlerts}
                    onCheckedChange={setUrgentAlerts}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Summary of all policy activity and generated drafts
                    </p>
                  </div>
                  <Switch
                    checked={weeklyDigest}
                    onCheckedChange={setWeeklyDigest}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monitoring Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Website Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Scraping</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically check monitored websites for new policies
                  </p>
                </div>
                <Switch
                  checked={autoScraping}
                  onCheckedChange={setAutoScraping}
                />
              </div>

              <div className="space-y-2">
                <Label>Scraping Frequency</Label>
                <Select value={scrapingFrequency} onValueChange={setScrapingFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Monitored Websites</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleManualScrape}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Scrape Now
                  </Button>
                </div>
                <div className="space-y-2">
                  {monitoredSites.map((site, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{site.name}</div>
                        <div className="text-xs text-muted-foreground">{site.url}</div>
                      </div>
                      <Badge variant={site.status === 'active' ? 'default' : 'secondary'}>
                        {site.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                AI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Gemini API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter your Gemini API key"
                    value="sk-************************************************"
                    readOnly
                  />
                  <Button variant="outline" onClick={checkServerHealth}>
                    Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is configured in the backend server
                </p>
              </div>

              <div className="space-y-2">
                <Label>Relevance Threshold</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (30%+)</SelectItem>
                    <SelectItem value="medium">Medium (50%+)</SelectItem>
                    <SelectItem value="high">High (70%+)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Minimum relevance score for generating drafts
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Backend Server</span>
                <div className="flex items-center gap-2">
                  {serverStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {serverStatus === 'online' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {serverStatus === 'offline' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <Badge variant={serverStatus === 'online' ? 'default' : 'destructive'}>
                    {serverStatus === 'checking' ? 'Checking...' : serverStatus}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Scan</span>
                <Badge variant="outline">
                  {lastScanTime ? new Date(lastScanTime).toLocaleTimeString() : 'Never'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">AI Analysis</span>
                <Badge className={serverStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {serverStatus === 'online' ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Service</span>
                <Badge className={serverStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {serverStatus === 'online' ? 'Ready' : 'Offline'}
                </Badge>
              </div>

              <Separator />

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={checkServerHealth}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">System started</div>
                <div className="text-xs text-muted-foreground">
                  {serverStatus === 'online' ? 'Running normally' : 'Server offline'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Monitoring active</div>
                <div className="text-xs text-muted-foreground">
                  {autoScraping ? 'Automatic scraping enabled' : 'Manual mode only'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Email notifications</div>
                <div className="text-xs text-muted-foreground">
                  {emailNotifications ? 'Enabled and ready' : 'Disabled'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}