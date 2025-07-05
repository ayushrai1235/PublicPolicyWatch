import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  AlertCircle, 
  FileText, 
  Calendar,
  Download,
  Mail,
  ExternalLink,
  Copy,
  Brain,
  BarChart3,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { apiService, Policy } from '@/services/api';
import { toast } from 'sonner';

export function PolicyDetails() {
  const { id } = useParams();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);

  useEffect(() => {
    loadPolicy();
  }, [id]);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const response = await apiService.getPolicies();
      if (response.data) {
        const foundPolicy = response.data.find(p => p.id === id);
        if (foundPolicy) {
          setPolicy(foundPolicy);
        } else {
          toast.error('Policy not found');
        }
      } else {
        toast.error('Failed to load policy details');
      }
    } catch (error) {
      console.error('Error loading policy:', error);
      toast.error('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzePolicy = async () => {
    if (!policy) return;
    
    setAnalyzing(true);
    try {
      const response = await apiService.analyzePolicy(policy);
      if (response.data) {
        // Update policy with analysis
        setPolicy(prev => prev ? {
          ...prev,
          aiAnalysis: {
            ...response.data,
            draftsGenerated: 3,
            drafts: {
              legal: '',
              emotional: '',
              dataBacked: ''
            }
          }
        } : null);
        toast.success('Policy analysis completed');
      } else {
        toast.error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze policy');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateDraft = async (tone: string) => {
    if (!policy) return;
    
    setGeneratingDraft(tone);
    try {
      const response = await apiService.generateDraft(policy, tone);
      if (response.data) {
        // Update policy with generated draft
        setPolicy(prev => prev ? {
          ...prev,
          aiAnalysis: {
            ...prev.aiAnalysis!,
            drafts: {
              ...prev.aiAnalysis!.drafts,
              [tone]: response.data!.draft
            }
          }
        } : null);
        toast.success(`${tone} draft generated successfully`);
      } else {
        toast.error(response.error || 'Draft generation failed');
      }
    } catch (error) {
      console.error('Draft generation error:', error);
      toast.error('Failed to generate draft');
    } finally {
      setGeneratingDraft(null);
    }
  };

  const handleCopyDraft = async (draft: string, type: string) => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopiedDraft(type);
      toast.success(`${type} draft copied to clipboard`);
      setTimeout(() => setCopiedDraft(null), 2000);
    } catch (error) {
      toast.error('Failed to copy draft');
    }
  };

  const handleDownloadDraft = (draft: string, type: string) => {
    if (!policy) return;
    
    const blob = new Blob([draft], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${policy.title.replace(/\s+/g, '_')}_${type}_draft.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${type} draft downloaded`);
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading policy details...</p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Policy not found</h3>
          <p className="text-muted-foreground">
            The requested policy consultation could not be found.
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysLeft = getDaysUntilDeadline(policy.deadline);
  const urgency = daysLeft <= 7 ? 'urgent' : daysLeft <= 30 ? 'warning' : 'normal';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{policy.ministry}</Badge>
                <Badge className={urgency === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                  {policy.status}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold leading-tight">{policy.title}</h1>
              <p className="text-muted-foreground">{policy.description}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={policy.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View Source
                </a>
              </Button>
              <Button className="gap-2">
                <Mail className="h-4 w-4" />
                Email Drafts
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date(policy.deadline).toLocaleDateString()}</div>
            <p className={`text-sm ${urgency === 'urgent' ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
              {daysLeft > 0 ? `${daysLeft} days remaining` : 'Deadline passed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policy.aiAnalysis ? (
              <>
                <div className="text-2xl font-bold">{policy.aiAnalysis.relevanceScore}%</div>
                <p className="text-sm text-muted-foreground">Animal welfare relevance</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">--</div>
                <Button 
                  size="sm" 
                  onClick={handleAnalyzePolicy}
                  disabled={analyzing}
                  className="mt-2"
                >
                  {analyzing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Brain className="h-3 w-3 mr-1" />
                  )}
                  {analyzing ? 'Analyzing...' : 'Analyze Now'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Draft Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policy.aiAnalysis ? (
              <>
                <div className="text-2xl font-bold">Ready</div>
                <p className="text-sm text-muted-foreground">3 drafts available</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">Pending</div>
                <p className="text-sm text-muted-foreground">Analysis required first</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Analysis & Draft Responses</CardTitle>
        </CardHeader>
        <CardContent>
          {!policy.aiAnalysis ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Analysis Required</h3>
              <p className="text-muted-foreground mb-4">
                Run AI analysis first to generate policy insights and response drafts
              </p>
              <Button 
                onClick={handleAnalyzePolicy}
                disabled={analyzing}
                className="gap-2"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {analyzing ? 'Analyzing Policy...' : 'Start AI Analysis'}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
                <TabsTrigger value="legal">Legal Draft</TabsTrigger>
                <TabsTrigger value="emotional">Emotional Draft</TabsTrigger>
                <TabsTrigger value="data">Data-Backed Draft</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Analysis Results</h3>
                    <p className="text-sm mb-3">{policy.aiAnalysis.analysis}</p>
                    
                    {policy.aiAnalysis.keyPoints && policy.aiAnalysis.keyPoints.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Key Points:</h4>
                        <ul className="space-y-1 text-sm">
                          {policy.aiAnalysis.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Relevance Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Animal Welfare Impact</span>
                            <span>{policy.aiAnalysis.relevanceScore}%</span>
                          </div>
                          <Progress value={policy.aiAnalysis.relevanceScore} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Urgency Level</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Time Sensitivity</span>
                            <span className="capitalize">{policy.aiAnalysis.urgencyLevel}</span>
                          </div>
                          <Progress 
                            value={policy.aiAnalysis.urgencyLevel === 'high' ? 90 : policy.aiAnalysis.urgencyLevel === 'medium' ? 60 : 30} 
                            className="h-2" 
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {['legal', 'emotional', 'dataBacked'].map((tone) => (
                <TabsContent key={tone} value={tone === 'dataBacked' ? 'data' : tone} className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {tone === 'legal' && 'Legal & Regulatory Focused Response'}
                        {tone === 'emotional' && 'Emotional & Compassionate Response'}
                        {tone === 'dataBacked' && 'Data-Driven & Evidence-Based Response'}
                      </h3>
                      <div className="flex gap-2">
                        {policy.aiAnalysis.drafts[tone as keyof typeof policy.aiAnalysis.drafts] ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyDraft(
                                policy.aiAnalysis!.drafts[tone as keyof typeof policy.aiAnalysis.drafts], 
                                tone
                              )}
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              {copiedDraft === tone ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDraft(
                                policy.aiAnalysis!.drafts[tone as keyof typeof policy.aiAnalysis.drafts], 
                                tone
                              )}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleGenerateDraft(tone)}
                            disabled={generatingDraft === tone}
                            className="gap-2"
                          >
                            {generatingDraft === tone ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            {generatingDraft === tone ? 'Generating...' : 'Generate Draft'}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      {policy.aiAnalysis.drafts[tone as keyof typeof policy.aiAnalysis.drafts] ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {policy.aiAnalysis.drafts[tone as keyof typeof policy.aiAnalysis.drafts]}
                        </p>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click "Generate Draft" to create a {tone} response
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}