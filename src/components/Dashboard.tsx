import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  Calendar,
  Filter,
  Search,
  TrendingUp,
  Users,
  Mail,
  RefreshCw,
  Globe,
  Loader2,
  AlertTriangle,
  Brain,
  Trash2
} from 'lucide-react';
import { apiService, Policy } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({
    activeConsultations: 0,
    draftsGenerated: 0,
    successRate: 0,
    totalSubmissions: 0
  });

  // Load policies on component mount
  useEffect(() => {
    loadPolicies();
  }, []);

  // Filter policies when search/filter criteria change
  useEffect(() => {
    let filtered = policies;

    if (searchTerm) {
      filtered = filtered.filter(policy => 
        policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.ministry.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(policy => policy.status === statusFilter);
    }

    if (ministryFilter !== 'all') {
      filtered = filtered.filter(policy => policy.ministry === ministryFilter);
    }

    setFilteredPolicies(filtered);
  }, [searchTerm, statusFilter, ministryFilter, policies]);

  // Update stats when policies change
  useEffect(() => {
    const activePolicies = policies.filter(p => p.status === 'active').length;
    const analyzedPolicies = policies.filter(p => p.aiAnalysis).length;
    const totalDrafts = policies.reduce((sum, p) => {
      if (!p.aiAnalysis?.drafts) return sum;
      const drafts = Object.values(p.aiAnalysis.drafts).filter(draft => draft && draft.length > 0);
      return sum + drafts.length;
    }, 0);
    const successfulAnalyses = policies.filter(p => p.aiAnalysis?.relevanceScore && p.aiAnalysis.relevanceScore > 50).length;
    const successRate = analyzedPolicies > 0 ? Math.round((successfulAnalyses / analyzedPolicies) * 100) : 0;

    setStats({
      activeConsultations: activePolicies,
      draftsGenerated: totalDrafts,
      successRate: successRate,
      totalSubmissions: policies.length
    });
  }, [policies]);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const response = await apiService.getPolicies();
      if (response.data) {
        setPolicies(response.data);
        console.log(`📊 Loaded ${response.data.length} policies from storage`);
      } else {
        toast.error(response.error || 'Failed to load policies');
        setPolicies([]);
      }
    } catch (error) {
      console.error('Error loading policies:', error);
      toast.error('Failed to connect to backend server');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScraping = async () => {
    setScraping(true);
    try {
      toast.info('Starting manual scraping of government websites...');
      const response = await apiService.triggerScraping();
      
      if (response.data) {
        toast.success(`Scraping completed! Found ${response.data.policiesFound} new policies`);
        // Reload policies after scraping
        await loadPolicies();
      } else {
        toast.error(response.error || 'Scraping failed');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      toast.error('Failed to trigger scraping');
    } finally {
      setScraping(false);
    }
  };

  const handleAnalyzePending = async () => {
    setAnalyzing(true);
    try {
      toast.info('Starting AI analysis of pending policies...');
      const response = await apiService.analyzePending();
      
      if (response.data) {
        toast.success(`Analysis completed! Analyzed ${response.data.analyzed} policies, found ${response.data.relevant} relevant`);
        // Reload policies after analysis
        await loadPolicies();
      } else {
        toast.error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to trigger analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClearPolicies = async () => {
    if (!confirm('Are you sure you want to clear all policies? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await apiService.clearPolicies();
      if (response.data) {
        toast.success('All policies cleared successfully');
        setPolicies([]);
      } else {
        toast.error(response.error || 'Failed to clear policies');
      }
    } catch (error) {
      console.error('Clear policies error:', error);
      toast.error('Failed to clear policies');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4 text-green-500" />;
      case 'urgent': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'urgent': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUniqueMinistries = () => {
    const ministries = [...new Set(policies.map(p => p.ministry))];
    return ministries.sort();
  };

  const pendingAnalysisCount = policies.filter(p => !p.aiAnalysis).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading policies from storage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Policy Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and respond to animal welfare policy consultations
            </p>
          </div>
          <div className="flex gap-2">
            {pendingAnalysisCount > 0 && (
              <Button 
                onClick={handleAnalyzePending} 
                disabled={analyzing}
                variant="outline"
                className="gap-2"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {analyzing ? 'Analyzing...' : `Analyze ${pendingAnalysisCount} Pending`}
              </Button>
            )}
            <Button 
              onClick={handleManualScraping} 
              disabled={scraping}
              variant="outline"
              className="gap-2"
            >
              {scraping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {scraping ? 'Scraping...' : 'Scrape New'}
            </Button>
            <Button onClick={loadPolicies} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={handleClearPolicies}
              variant="outline"
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                {pendingAnalysisCount} pending analysis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Consultations</CardTitle>
              <AlertCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeConsultations}</div>
              <p className="text-xs text-muted-foreground">
                Currently open for submissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts Generated</CardTitle>
              <Brain className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draftsGenerated}</div>
              <p className="text-xs text-muted-foreground">
                AI-generated responses ready
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                Animal welfare relevance
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ministryFilter} onValueChange={setMinistryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ministry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ministries</SelectItem>
                {getUniqueMinistries().map(ministry => (
                  <SelectItem key={ministry} value={ministry}>{ministry}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Policies List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {filteredPolicies.length === 0 && policies.length === 0 
              ? 'No Policies Found' 
              : `Policies (${filteredPolicies.length})`
            }
          </h2>
          <Tabs defaultValue="grid" className="w-auto">
            <TabsList>
              <TabsTrigger value="grid">Grid</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {policies.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No policies in storage</h3>
              <p className="text-muted-foreground mb-4">
                Click "Scrape New" to fetch the latest policies from government websites
              </p>
              <Button 
                onClick={handleManualScraping} 
                disabled={scraping}
                className="gap-2"
              >
                {scraping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                {scraping ? 'Scraping...' : 'Scrape Government Websites'}
              </Button>
            </CardContent>
          </Card>
        ) : filteredPolicies.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No policies match your filters</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPolicies.map((policy) => {
              const daysLeft = getDaysUntilDeadline(policy.deadline);
              const urgency = daysLeft <= 7 ? 'urgent' : daysLeft <= 30 ? 'warning' : 'normal';
              
              return (
                <Card key={policy.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(policy.status)}
                        <Badge className={getStatusColor(policy.status)}>
                          {policy.status}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {policy.ministry}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {policy.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {policy.description}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Deadline: {new Date(policy.deadline).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={urgency === 'urgent' ? 'text-red-500 font-medium' : ''}>
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                        </span>
                      </div>
                    </div>

                    {policy.aiAnalysis ? (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium text-green-600 mb-1">AI Analysis Complete</p>
                        <p className="text-xs text-muted-foreground">
                          {policy.aiAnalysis.relevanceScore}% relevance • 
                          {policy.aiAnalysis.isAnimalWelfare ? ' Animal welfare related' : ' Not animal welfare related'}
                        </p>
                        {policy.aiAnalysis.drafts && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {Object.values(policy.aiAnalysis.drafts).filter(d => d && d.length > 0).length} drafts ready
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm font-medium text-yellow-600 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Analysis Pending
                        </p>
                        <p className="text-xs text-muted-foreground">
                          AI analysis not yet completed
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-muted-foreground">
                          Discovered {formatDistanceToNow(new Date(policy.discoveredAt))} ago
                        </span>
                      </div>
                      <Link to={`/policy/${policy.id}`}>
                        <Button size="sm" className="gap-1">
                          View Details
                          <FileText className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}