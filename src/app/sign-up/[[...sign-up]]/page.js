import { SignUp } from "@clerk/nextjs";
import { CheckSquare } from "lucide-react";

export default function SignUpPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
      <div className="brand" style={{ marginBottom: '2rem', fontSize: '2rem' }}>
        <CheckSquare className="brand-icon" size={32} />
        <span>MEGA Task Sync</span>
      </div>
      <SignUp 
        appearance={{
          variables: {
            colorPrimary: "hsl(263, 90%, 65%)",
            colorBackground: "hsl(224, 25%, 11%)",
            colorText: "hsl(210, 40%, 98%)",
            colorTextSecondary: "hsl(215, 20%, 65%)",
            colorInputBackground: "rgba(15, 23, 42, 0.4)",
            colorInputText: "hsl(210, 40%, 98%)",
            colorBorder: "rgba(255, 255, 255, 0.08)"
          },
          elements: {
            card: {
              background: "var(--glass-bg)",
              backdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
              borderRadius: "1.25rem"
            },
            headerTitle: {
              fontFamily: "var(--font-family)"
            },
            headerSubtitle: {
              color: "var(--text-secondary)"
            },
            socialButtonsBlockButton: {
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              '&:hover': {
                background: "rgba(255, 255, 255, 0.06)",
                borderColor: "var(--border-active)"
              }
            },
            formButtonPrimary: {
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
              border: "none",
              '&:hover': {
                filter: "brightness(1.1)"
              }
            },
            footerActionLink: {
              color: "var(--color-primary)",
              '&:hover': {
                color: "var(--color-secondary)"
              }
            }
          }
        }}
      />
    </div>
  );
}
