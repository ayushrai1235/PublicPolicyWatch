import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { Navigation } from '@/components/Navigation';
import { Dashboard } from '@/components/Dashboard';
import { PolicyDetails } from '@/components/PolicyDetails';
import { Settings } from '@/components/Settings';
import { NotificationProvider } from '@/contexts/NotificationContext';
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <NotificationProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/policy/:id" element={<PolicyDetails />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
            <Toaster />
          </div>
        </Router>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;