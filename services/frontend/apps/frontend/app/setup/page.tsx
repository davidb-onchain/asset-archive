import { SetupPageContent } from "@/components/setup-page-content"

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-4">CMS Setup</h1>
          <p className="text-gray-600">Configure your Strapi CMS connection to manage content</p>
        </div>
        
        <SetupPageContent />
      </div>
    </div>
  )
} 