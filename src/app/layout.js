import "./globals.css";

export const metadata = {
  title: "MEGA Task Sync & To-Do Planner",
  description: "Generate beautiful, structured interactive to-do checklists directly from your MEGA file sharing links.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
