import { useState, useCallback, useEffect } from "react";
import {
    UiGround,
    EmbeddingService,
    QueryOrchestrator,
    type NodeRecord,
    type MatchResult,
    type SemanticQueryAST,
} from "ui-ground-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import * as LucideIcons from "lucide-react";
import {
    Search,
    Loader2,
    Database,
    Sparkles,
    MousePointer,
    CheckCircle,
    Sun,
    Moon,
    Scan,
    Zap,
    ShoppingCart,
    Heart,
    Star,
    User,
    Settings,
    Bell,
    LogOut,
    CreditCard,
    Package,
    HelpCircle,
} from "lucide-react";

// Import WASM module
import init, { WasmUiDb } from "../../pkg/ui_ground_wasm.js";

// WASM initialization promise
const wasmPromise = init().then(() => {
    console.log("[App] WASM module initialized");
    return WasmUiDb;
}).catch((err) => {
    console.warn("[App] WASM not available:", err);
    return undefined;
});

// Embedding service (shared)
const embeddingService = new EmbeddingService();

export function App() {
    const [records, setRecords] = useState<NodeRecord[]>([]);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [query, setQuery] = useState("");
    const [isCollecting, setIsCollecting] = useState(false);
    const [isQuerying, setIsQuerying] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [modelLoading, setModelLoading] = useState(false);
    const [semanticEnabled, setSemanticEnabled] = useState(false);
    const [orchestrator, setOrchestrator] = useState<QueryOrchestrator | null>(null);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [isDark, setIsDark] = useState(true);

    // UiGround instance (initialized after WASM is ready)
    const [uiGround, setUiGround] = useState<UiGround | null>(null);
    const [engineType, setEngineType] = useState<"wasm" | "js">("js");

    // Initialize UiGround after WASM is ready
    useEffect(() => {
        wasmPromise.then((WasmModule) => {
            const instance = new UiGround({
                iconLibrary: LucideIcons,
                engine: 'auto',
                wasmModule: WasmModule,
            });
            setUiGround(instance);
            setEngineType(instance.getEngineType());
            console.log(`[App] UiGround initialized with engine: ${instance.getEngineType()}`);
        });
    }, []);

    // Theme toggle
    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark);
    }, [isDark]);

    // Initialize embedding service
    const initEmbeddings = useCallback(async () => {
        if (modelLoading || modelReady || !uiGround) return;
        setModelLoading(true);
        try {
            await embeddingService.initialize();
            const orch = new QueryOrchestrator(uiGround["db"], embeddingService);
            setOrchestrator(orch);
            setModelReady(true);
        } catch (error) {
            console.error("Failed to load embedding model:", error);
        } finally {
            setModelLoading(false);
        }
    }, [modelLoading, modelReady, uiGround]);

    // Collect DOM snapshot
    const handleCollect = useCallback(async () => {
        if (!uiGround) return;
        setIsCollecting(true);
        try {
            await new Promise((r) => setTimeout(r, 100));
            const snapshot = uiGround.snapshot();
            setRecords(snapshot);
            setResults([]);
        } finally {
            setIsCollecting(false);
        }
    }, [uiGround]);

    // Execute query
    const handleQuery = useCallback(async () => {
        if (!query.trim()) return;
        setIsQuerying(true);
        const start = performance.now();

        try {
            const ast: SemanticQueryAST = {
                where: [
                    { name: { match: "fuzzy", value: query } },
                    { state: { visible: true } },
                ],
                limit: 10,
            };

            if (semanticEnabled && orchestrator) {
                ast.semantic = {
                    enabled: true,
                    text: query,
                    threshold: 0.4,
                    topK: 10,
                };
                const result = await orchestrator.query(ast);
                setResults(result.matches);
            } else {
                if (!uiGround) return;
                const result = uiGround.query(ast);
                setResults(result.matches);
            }
        } catch (error) {
            console.error("Query failed:", error);
        } finally {
            setExecutionTime(performance.now() - start);
            setIsQuerying(false);
        }
    }, [query, semanticEnabled, orchestrator, uiGround]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleQuery();
    };

    const handleResultClick = (id: number) => {
        if (!uiGround) return;
        const element = uiGround.resolveHandle(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            const el = element as HTMLElement;
            el.style.outline = "3px solid var(--primary)";
            el.style.outlineOffset = "2px";
            setTimeout(() => {
                el.style.outline = "";
                el.style.outlineOffset = "";
            }, 2000);
        }
    };

    // Use engineType from state (set during WASM initialization)
    const isWasm = engineType === "wasm";

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold">UI-Ground SDK</h1>
                            <p className="text-sm text-muted-foreground">Query Engine Demo</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Engine Status */}
                        <Badge variant="outline" className={`gap-1.5 px-2 py-1 text-xs ${isWasm ? "border-primary text-primary" : ""}`}>
                            {isWasm ? (
                                <>
                                    <Zap className="w-3 h-3 text-primary" />
                                    WASM
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                    JS
                                </>
                            )}
                        </Badge>
                        {/* Elements Count */}
                        <Badge variant={records.length > 0 ? "default" : "outline"} className="gap-1.5 px-2 py-1 text-xs">
                            <Database className="w-3 h-3" />
                            {records.length}
                        </Badge>
                        {/* AI Status */}
                        <Badge
                            variant={modelReady ? "default" : "outline"}
                            className={`gap-1.5 px-2 py-1 text-xs ${modelReady ? "bg-primary text-primary-foreground" : ""}`}
                        >
                            <Sparkles className="w-3 h-3" />
                            {modelLoading ? "..." : modelReady ? "AI" : "—"}
                        </Badge>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsDark(!isDark)}
                            className="rounded-full h-8 w-8"
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Query Engine */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Scan className="w-5 h-5 text-primary" />
                                Query Engine
                            </CardTitle>
                            <CardDescription>
                                Collect page elements and search with natural language
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={handleCollect} disabled={isCollecting} variant="outline">
                                    {isCollecting ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Scan className="w-4 h-4 mr-2" />
                                    )}
                                    Collect Snapshot
                                </Button>
                                <Button
                                    onClick={initEmbeddings}
                                    disabled={modelLoading || modelReady}
                                    variant={modelReady ? "ghost" : "default"}
                                >
                                    {modelLoading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 mr-2" />
                                    )}
                                    {modelReady ? "Model Loaded" : "Load AI Model"}
                                </Button>
                                {modelReady && (
                                    <Button
                                        onClick={() => setSemanticEnabled(!semanticEnabled)}
                                        variant={semanticEnabled ? "default" : "outline"}
                                    >
                                        <Zap className="w-4 h-4 mr-2" />
                                        Semantic: {semanticEnabled ? "ON" : "OFF"}
                                    </Button>
                                )}
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search... 'add to cart', 'checkout', 'profile'"
                                    className="pl-10"
                                />
                            </div>

                            <Button onClick={handleQuery} disabled={isQuerying || !query.trim()} className="w-full">
                                {isQuerying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                Search Elements
                            </Button>

                            {executionTime !== null && (
                                <p className="text-xs text-muted-foreground text-center">
                                    Found {results.length} results in {executionTime.toFixed(1)}ms
                                    {semanticEnabled && " • Semantic"}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Results */}
                    {results.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MousePointer className="w-4 h-4 text-primary" />
                                    Results
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {results.map((match) => (
                                    <div
                                        key={match.id}
                                        onClick={() => handleResultClick(match.id)}
                                        className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="secondary" className="text-xs">
                                                    {match.role}
                                                </Badge>
                                                <span className="font-medium truncate text-sm">
                                                    {match.name || "(unnamed)"}
                                                </span>
                                            </div>
                                            {match.context.length > 0 && (
                                                <p className="text-xs text-muted-foreground truncate mt-1">
                                                    {match.context.slice(0, 2).join(" › ")}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-mono text-primary">
                                                {Math.round(match.score * 100)}%
                                            </span>
                                            {match.states.visible && (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Sample App */}
                <div className="space-y-6">
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                        <ShoppingCart className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                    <span className="font-semibold">ShopDemo</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="relative">
                                        <Bell className="w-4 h-4" />
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">3</span>
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <User className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Product Card */}
                            <div className="border border-border rounded-lg overflow-hidden">
                                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                                    <Package className="w-16 h-16 text-muted-foreground/50" />
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold">Premium Wireless Headphones</h3>
                                            <div className="flex items-center gap-1 mt-1">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Star key={i} className={`w-3.5 h-3.5 ${i <= 4 ? 'fill-primary text-primary' : 'text-muted'}`} />
                                                ))}
                                                <span className="text-xs text-muted-foreground ml-1">(128 reviews)</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon">
                                            <Heart className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <p className="text-2xl font-bold">$299.99</p>
                                    <div className="flex gap-2">
                                        <Button className="flex-1" data-testid="add-to-cart">
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            Add to Cart
                                        </Button>
                                        <Button variant="outline" data-testid="buy-now">
                                            Buy Now
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="justify-start" data-testid="view-cart">
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    View Cart
                                </Button>
                                <Button variant="outline" className="justify-start" data-testid="checkout">
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Checkout
                                </Button>
                                <Button variant="outline" className="justify-start" data-testid="my-orders">
                                    <Package className="w-4 h-4 mr-2" />
                                    My Orders
                                </Button>
                                <Button variant="outline" className="justify-start" data-testid="wishlist">
                                    <Heart className="w-4 h-4 mr-2" />
                                    Wishlist
                                </Button>
                            </div>

                            <Separator />

                            {/* User Section */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">Account</h4>
                                <div className="space-y-1">
                                    <Button variant="ghost" className="w-full justify-start" data-testid="profile-settings">
                                        <Settings className="w-4 h-4 mr-2" />
                                        Profile Settings
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start" data-testid="help-support">
                                        <HelpCircle className="w-4 h-4 mr-2" />
                                        Help & Support
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" data-testid="logout">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Log Out
                                    </Button>
                                </div>
                            </div>

                            {/* Search & Form */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground">Search Products</h4>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input placeholder="Search products..." className="pl-10" data-testid="product-search" />
                                </div>
                                <Button variant="secondary" className="w-full" data-testid="search-button">
                                    <Search className="w-4 h-4 mr-2" />
                                    Search
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-xs text-muted-foreground text-center">
                        ↑ This is the sample UI being indexed. Click "Collect Snapshot" then search for elements.
                    </p>
                </div>
            </main>
        </div>
    );
}

export default App;