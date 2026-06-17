"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Link2, FolderOpen, Clock, ArrowRight, AlertTriangle, Trash2, Sparkles, CheckSquare, LogOut, User } from "lucide-react";

const DEMO_STRUCTURE = {
  name: "Project Apollo - Web App Dev",
  directory: true,
  children: [
    {
      name: "01_Design_Assets",
      directory: true,
      children: [
        { name: "logo_v2.svg", directory: false, size: 14204 },
        { name: "style_guide.pdf", directory: false, size: 2840192 },
        { name: "wireframes.fig", directory: false, size: 592010 }
      ]
    },
    {
      name: "02_Source_Code",
      directory: true,
      children: [
        {
          name: "components",
          directory: true,
          children: [
            { name: "Button.jsx", directory: false, size: 2403 },
            { name: "Header.jsx", directory: false, size: 5120 },
            { name: "Sidebar.jsx", directory: false, size: 8902 }
          ]
        },
        {
          name: "pages",
          directory: true,
          children: [
            { name: "_app.js", directory: false, size: 1054 },
            { name: "index.js", directory: false, size: 3902 }
          ]
        },
        { name: "package.json", directory: false, size: 1450 }
      ]
    },
    {
      name: "03_Documentation",
      directory: true,
      children: [
        { name: "API_Endpoints.md", directory: false, size: 12040 },
        { name: "Deployment_Guide.md", directory: false, size: 4902 },
        { name: "README.md", directory: false, size: 3120 }
      ]
    },
    { name: "build_config.js", directory: false, size: 890 }
  ]
};

export default function Home() {
  const [megaUrl, setMegaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Load User and history
  useEffect(() => {
    const fetchUserAndHistory = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        await loadHistory(currentUser);
      }
    };
    fetchUserAndHistory();
  }, [supabase]);

  const loadHistory = async (currentUser) => {
    try {
      const { data, error: dbError } = await supabase
        .from("parsed_links")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("last_accessed", { ascending: false })
        .limit(5);

      if (dbError) throw dbError;

      if (data) {
        setHistory(data.map(item => ({
          url: item.url,
          name: item.name,
          timestamp: new Date(item.last_accessed).toLocaleString()
        })));
      }
    } catch (err) {
      console.warn("DB history load failed (Table may not exist yet). Falling back to localStorage:", err.message);
      const savedHistory = localStorage.getItem("megaHistory");
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
  };

  const saveToHistory = async (url, name) => {
    const timestamp = new Date().toISOString();
    
    if (user) {
      try {
        const { error: dbError } = await supabase
          .from("parsed_links")
          .upsert({
            user_id: user.id,
            url,
            name,
            last_accessed: timestamp
          }, { onConflict: "user_id,url" });

        if (dbError) throw dbError;
        await loadHistory(user);
      } catch (err) {
        console.warn("DB history save failed (Table may not exist yet). Falling back to localStorage:", err.message);
        
        // Local fallback
        const newHistory = [
          { url, name, timestamp: new Date().toLocaleString() },
          ...history.filter(item => item.url !== url)
        ].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem("megaHistory", JSON.stringify(newHistory));
      }
    }
  };

  const clearHistory = async (e) => {
    e.stopPropagation();
    
    if (user) {
      try {
        const { error: dbError } = await supabase
          .from("parsed_links")
          .delete()
          .eq("user_id", user.id);

        if (dbError) throw dbError;
        setHistory([]);
      } catch (err) {
        console.warn("DB history delete failed. Falling back to localStorage:", err.message);
        setHistory([]);
        localStorage.removeItem("megaHistory");
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const handleFetch = async (urlToFetch) => {
    if (!urlToFetch) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/mega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToFetch }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process the MEGA link.");
      }

      // Save structure and url to localStorage
      localStorage.setItem("currentMegaStructure", JSON.stringify(data));
      localStorage.setItem("currentMegaUrl", urlToFetch);

      // Save to history (DB or fallback)
      await saveToHistory(urlToFetch, data.name);

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "An error occurred while loading the link.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleFetch(megaUrl);
  };

  const handleDemoLoad = () => {
    localStorage.setItem("currentMegaStructure", JSON.stringify(DEMO_STRUCTURE));
    localStorage.setItem("currentMegaUrl", "https://mega.nz/folder/demo#project-apollo");
    router.push("/dashboard");
  };

  return (
    <>
      <nav className="navbar">
        <div className="brand">
          <CheckSquare className="brand-icon" size={24} />
          <span>MEGA Task Sync</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <User size={14} />
              <span>{user.email}</span>
            </div>
            <button className="back-button" onClick={handleSignOut} style={{ fontSize: '0.85rem' }}>
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </nav>

      <section className="hero-section">
        <h1 className="gradient-title">Turn MEGA Links into Interactive Task Lists</h1>
        <p className="hero-subtitle">
          Paste a public MEGA folder or file link to map its structures, organize your workload, and check off tasks.
        </p>

        <div className="glass-card">
          <form onSubmit={handleFormSubmit}>
            <div className="input-group">
              <div className="url-input-wrapper">
                <input
                  type="text"
                  className="text-input"
                  placeholder="Paste your MEGA link (folder or file) here..."
                  value={megaUrl}
                  onChange={(e) => setMegaUrl(e.target.value)}
                  disabled={loading}
                />
                <Link2 className="url-icon" size={20} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !megaUrl}>
                {loading ? (
                  <>
                    <Clock className="spinner" size={18} />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Checklist</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="error-message">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={handleDemoLoad} style={{ gap: "0.6rem" }}>
              <Sparkles size={16} style={{ color: "var(--color-primary)" }} />
              <span>Try with Demo Folder Structure</span>
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="history-section">
            <div className="history-title">
              <Clock size={16} />
              <span>Recently Parsed Links</span>
              <button 
                onClick={clearHistory} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  fontSize: '0.8rem', 
                  marginLeft: 'auto',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>
            <div className="history-list">
              {history.map((item, index) => (
                <div key={index} className="history-item" onClick={() => handleFetch(item.url)}>
                  <div className="history-info">
                    <span className="history-name">{item.name}</span>
                    <span className="history-url">{item.url}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span className="history-time">{item.timestamp.split(',')[0]}</span>
                    <FolderOpen size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
