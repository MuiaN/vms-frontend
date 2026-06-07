import { useGetNews, getGetNewsQueryKey } from '@workspace/api-client-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, AlertCircle, RefreshCw } from 'lucide-react';

export default function DistributorNews() {
  const { data: articles, isLoading, isError, dataUpdatedAt } = useGetNews(
    { query: { queryKey: getGetNewsQueryKey(), refetchInterval: 30_000 } }
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">News Intelligence</h1>
            <p className="text-muted-foreground font-mono mt-1">INDUSTRY_FEED</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            LIVE · 30s POLL
            {dataUpdatedAt > 0 && (
              <span className="ml-2 text-muted-foreground/60">
                {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground font-mono gap-3">
            <RefreshCw className="w-4 h-4 animate-spin" />
            FETCHING_FEED...
          </div>
        )}

        {isError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-mono text-sm font-medium text-destructive">FEED_UNAVAILABLE</p>
                <p className="text-xs text-muted-foreground mt-0.5">Unable to fetch news feed. Retrying automatically every 30 seconds.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && articles && articles.length === 0 && (
          <div className="text-center py-24 text-muted-foreground font-mono">NO_ARTICLES_FOUND</div>
        )}

        {articles && articles.length > 0 && (
          <div className="grid gap-4">
            {articles.map((article, i) => (
              <Card key={i} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Newspaper className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-base leading-snug">{article.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] border-border shrink-0">
                      {article.source}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pl-11">
                  <p className="text-sm text-muted-foreground leading-relaxed">{article.summary}</p>
                  <p className="text-xs font-mono text-muted-foreground/60 mt-3">
                    {new Date(article.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
