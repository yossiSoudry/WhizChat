"use client";

import { useState } from "react";
import { ChatWidget } from "@/widget/ChatWidget";
import { ChatWidgetRealtime } from "@/widget/ChatWidgetRealtime";

export default function WidgetDemoPage() {
  const [useRealtime, setUseRealtime] = useState(true);

  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Widget Demo</h1>
        <p className="text-gray-600 mb-4">
          This page demonstrates the WhizChat widget. Click the chat button in
          the bottom right corner to open the widget.
        </p>

        {/* Toggle between modes */}
        <div className="bg-white rounded-lg shadow p-4 mb-8 flex items-center gap-4">
          <span className="font-medium">Widget Mode:</span>
          <button
            onClick={() => setUseRealtime(false)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !useRealtime
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Polling
          </button>
          <button
            onClick={() => setUseRealtime(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              useRealtime
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Realtime (Supabase)
          </button>
          {useRealtime && !supabaseUrl && (
            <span className="text-sm text-amber-600">
              Supabase not configured
            </span>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Sample Content</h2>
          <p className="text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Feature 1</h3>
            <p className="text-sm text-gray-600">
              Description of feature 1...
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Feature 2</h3>
            <p className="text-sm text-gray-600">
              Description of feature 2...
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Widget Features</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Real-time messages with Supabase Realtime
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Typing indicators (presence)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Read receipts (blue checkmarks)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              FAQ quick responses
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Contact form (Email/WhatsApp)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Connection status indicator
            </li>
          </ul>
        </div>
      </div>

      {/* Chat Widget - Realtime or Polling */}
      {useRealtime ? (
        <ChatWidgetRealtime
          config={{
            position: "right",
            primaryColor: "#C026D3",
            secondaryColor: "#A21CAF",
          }}
          supabaseUrl={supabaseUrl}
          supabaseAnonKey={supabaseAnonKey}
        />
      ) : (
        <ChatWidget
          config={{
            position: "right",
            primaryColor: "#C026D3",
            secondaryColor: "#A21CAF",
          }}
        />
      )}
    </div>
  );
}
