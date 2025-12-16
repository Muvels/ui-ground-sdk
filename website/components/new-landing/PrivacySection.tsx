import React from "react";
import { ShieldCheck, EyeOff, Server, Lock } from "lucide-react";

export function PrivacySection() {
    return (
        <section className="py-24 bg-zinc-900 text-white rounded-[2.5rem] my-12 mx-4 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Zero-Vision, <span className="text-blue-400">Total Privacy.</span></h2>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        In the EU and beyond, sending screenshots to third-party models is a compliance nightmare.
                        UI-Ground parses the DOM locally, ensuring no sensitive user data ever leaves the user's browser or server.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <EyeOff className="w-10 h-10 text-blue-400 mb-6 mx-auto md:mx-0" />
                        <h3 className="text-xl font-bold mb-2">No Screenshots</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            We don't need pixels. Our semantic engine understands elements by code structure and computed style, bypassing vision models entirely.
                        </p>
                    </div>
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <Server className="w-10 h-10 text-violet-400 mb-6 mx-auto md:mx-0" />
                        <h3 className="text-xl font-bold mb-2">Local Processing</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            The WASM engine runs directly in your infrastructure. No external API calls required for DOM analysis.
                        </p>
                    </div>
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <Lock className="w-10 h-10 text-green-400 mb-6 mx-auto md:mx-0" />
                        <h3 className="text-xl font-bold mb-2">GDPR Compliant</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            Since personal data never leaves the client, you remain fully compliant with strict modifications data privacy regulations.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
