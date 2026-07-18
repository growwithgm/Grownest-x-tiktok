"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, Trash2, Edit, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TemplateEditor } from "@/components/template-editor"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { PackingSlipData } from "@/lib/types"

interface Template {
  name: string
  html: string
  css: string
}

export default function TemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [sampleData, setSampleData] = useState<PackingSlipData | undefined>(undefined)

  useEffect(() => {
    // Load templates from localStorage
    const storedTemplates = localStorage.getItem("customTemplates")
    if (storedTemplates) {
      try {
        setTemplates(JSON.parse(storedTemplates))
      } catch (error) {
        console.error("Failed to parse stored templates:", error)
      }
    }

    // Load sample data from localStorage if available
    const storedData = localStorage.getItem("packingSlips")
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setSampleData(parsedData[0])
        }
      } catch (error) {
        console.error("Failed to parse packing slips data:", error)
      }
    }
  }, [])

  const handleSaveTemplate = (template: Template) => {
    // Update templates list
    const updatedTemplates = [...templates]
    const existingIndex = updatedTemplates.findIndex((t) => t.name === template.name)

    if (existingIndex >= 0) {
      updatedTemplates[existingIndex] = template
    } else {
      updatedTemplates.push(template)
    }

    setTemplates(updatedTemplates)
    localStorage.setItem("customTemplates", JSON.stringify(updatedTemplates))

    // Close dialogs
    setIsEditing(false)
    setIsCreating(false)

    toast({
      title: "Template saved",
      description: `Template "${template.name}" has been saved successfully`,
    })
  }

  const handleDeleteTemplate = (templateName: string) => {
    const updatedTemplates = templates.filter((t) => t.name !== templateName)
    setTemplates(updatedTemplates)
    localStorage.setItem("customTemplates", JSON.stringify(updatedTemplates))

    toast({
      title: "Template deleted",
      description: `Template "${templateName}" has been deleted`,
    })
  }

  const handleDuplicateTemplate = (template: Template) => {
    const newName = `${template.name} (Copy)`
    const newTemplate = {
      ...template,
      name: newName,
    }

    const updatedTemplates = [...templates, newTemplate]
    setTemplates(updatedTemplates)
    localStorage.setItem("customTemplates", JSON.stringify(updatedTemplates))

    toast({
      title: "Template duplicated",
      description: `Template has been duplicated as "${newName}"`,
    })
  }

  const handleSetDefaultTemplate = (templateName: string) => {
    localStorage.setItem("defaultTemplate", templateName)

    toast({
      title: "Default template set",
      description: `"${templateName}" is now the default template`,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>Design your custom packing slip template with HTML and CSS</DialogDescription>
              </DialogHeader>
              <TemplateEditor sampleData={sampleData} onSave={handleSaveTemplate} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <h1 className="font-display text-4xl mb-3">Custom templates</h1>
          <p className="text-muted-foreground mb-6">
            Create and manage custom packing slip templates. These templates will be available when generating packing
            slips.
          </p>

          {templates.length === 0 ? (
            <Alert className="mb-6">
              <AlertTitle>No templates yet</AlertTitle>
              <AlertDescription>
                You haven't created any custom templates yet. Click "Create New Template" to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.name}>
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>Custom packing slip template</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-40 overflow-hidden border rounded bg-background p-2">
                      <iframe
                        srcDoc={`<style>${template.css}</style>${template.html}`}
                        title={template.name}
                        className="w-full h-full border-0 transform scale-50 origin-top-left"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => handleSetDefaultTemplate(template.name)}>
                      Set as Default
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Dialog
                        open={isEditing && selectedTemplate?.name === template.name}
                        onOpenChange={(open) => {
                          setIsEditing(open)
                          if (open) setSelectedTemplate(template)
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Template</DialogTitle>
                            <DialogDescription>Modify your custom packing slip template</DialogDescription>
                          </DialogHeader>
                          {selectedTemplate && (
                            <TemplateEditor
                              sampleData={sampleData}
                              onSave={handleSaveTemplate}
                              initialTemplate={selectedTemplate}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteTemplate(template.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
