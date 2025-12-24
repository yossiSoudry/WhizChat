"use client";

import { ChatWidget } from "@/widget/ChatWidget";

export default function WidgetDemoPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Widget Demo</h1>
        <p className="text-gray-600 mb-8">
          This page demonstrates the WhizChat widget. Click the chat button in
          the bottom right corner to open the widget.
        </p>

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
      </div>

      {/* Chat Widget */}
      <ChatWidget
        config={{
          position: "right",
          primaryColor: "#A31CAF",
          secondaryColor: "#39C3EF",
        }}
      />
    </div>
  );
}
