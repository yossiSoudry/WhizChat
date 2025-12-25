"use client";

import { ChatWidget } from "@/widget";

export default function TestWidgetPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Simulated website content */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              🏪 חנות לדוגמה
            </h1>
            <nav className="flex gap-6 text-sm">
              <a href="#" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                מוצרים
              </a>
              <a href="#" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                אודות
              </a>
              <a href="#" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                צור קשר
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Hero section */}
        <section className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            ברוכים הבאים לחנות שלנו
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            זהו דף בדיקה לווידג'ט WhizChat. הווידג'ט אמור להופיע בפינה הימנית התחתונה של המסך.
          </p>
        </section>

        {/* Product grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <div className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-xl mb-4" />
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                מוצר לדוגמה {i}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                תיאור קצר של המוצר עם פרטים חשובים ללקוח.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ₪{99 * i}
                </span>
                <button className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-medium rounded-lg transition-colors">
                  הוסף לסל
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Info box */}
        <section className="bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-800 rounded-2xl p-6 text-center">
          <h3 className="font-semibold text-fuchsia-900 dark:text-fuchsia-100 mb-2">
            💬 בדיקת הווידג'ט
          </h3>
          <p className="text-fuchsia-700 dark:text-fuchsia-300 text-sm">
            לחץ על כפתור הצ'אט בפינה הימנית התחתונה כדי לפתוח את הווידג'ט.
            <br />
            שים לב: ה-API צריך לרוץ כדי שהצ'אט יעבוד.
          </p>
        </section>
      </main>

      <footer className="border-t bg-white dark:bg-slate-900 mt-16">
        <div className="container mx-auto px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
          © 2024 חנות לדוגמה - דף בדיקה לווידג'ט WhizChat
        </div>
      </footer>

      {/* WhizChat Widget */}
      <ChatWidget
        apiUrl=""
        config={{
          primaryColor: "#C026D3",
          secondaryColor: "#A21CAF",
          position: "right",
        }}
      />
    </div>
  );
}
