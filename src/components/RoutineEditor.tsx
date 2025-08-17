import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Save, 
  Upload, 
  Edit3, 
  Loader2,
  CheckCircle,
  Brain
} from "lucide-react";

interface GeneratedRoutine {
  title: string;
  description: string;
  steps: Array<{
    step: number;
    action: string;
    duration?: string;
    notes?: string;
  }>;
}

const RoutineEditor = () => {
  const [userInput, setUserInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedRoutine, setGeneratedRoutine] = useState<GeneratedRoutine | null>(null);
  const [editableRoutine, setEditableRoutine] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Load saved routine from localStorage on component mount
  useEffect(() => {
    const savedRoutine = localStorage.getItem("aiRoutine");
    if (savedRoutine) {
      try {
        const parsed = JSON.parse(savedRoutine);
        setGeneratedRoutine(parsed);
        setEditableRoutine(JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.error("Error loading saved routine:", error);
      }
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      toast({
        title: "Image uploaded",
        description: `Selected: ${file.name}`,
      });
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateRoutine = async () => {
    if (!userInput.trim()) {
      toast({
        title: "Input required",
        description: "Please describe what kind of routine you want to create.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      let imageBase64 = "";
      if (imageFile) {
        imageBase64 = await convertImageToBase64(imageFile);
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userInput,
          image: imageBase64,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate routine");
      }

      const data = await response.json();
      setGeneratedRoutine(data.routine);
      setEditableRoutine(JSON.stringify(data.routine, null, 2));
      
      toast({
        title: "Routine generated!",
        description: "Your AI-powered routine has been created successfully.",
      });
    } catch (error) {
      console.error("Error generating routine:", error);
      toast({
        title: "Generation failed",
        description: "Unable to generate routine. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveRoutine = () => {
    try {
      let routineToSave;
      if (isEditing) {
        routineToSave = JSON.parse(editableRoutine);
      } else {
        routineToSave = generatedRoutine;
      }
      
      localStorage.setItem("aiRoutine", JSON.stringify(routineToSave));
      setGeneratedRoutine(routineToSave);
      setIsEditing(false);
      
      toast({
        title: "Routine saved!",
        description: "Your routine has been saved to local storage.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Invalid JSON format. Please check your edits.",
        variant: "destructive",
      });
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      try {
        const parsed = JSON.parse(editableRoutine);
        setGeneratedRoutine(parsed);
        setIsEditing(false);
      } catch (error) {
        toast({
          title: "Invalid format",
          description: "Please check your JSON format before saving.",
          variant: "destructive",
        });
        return;
      }
    } else {
      setIsEditing(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-card">
          <CardHeader>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Describe Your Ideal Routine
            </h2>
            <p className="text-muted-foreground">
              Tell the AI what kind of routine you want to create. Be as specific or as general as you like.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="routine-input">Routine Description</Label>
              <Textarea
                id="routine-input"
                placeholder="I want a morning routine that helps me feel energized and productive. Include meditation, exercise, and healthy breakfast preparation..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="min-h-32 resize-none"
              />
            </div>
            
            <div>
              <Label htmlFor="image-upload">Optional: Upload Reference Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {imageFile && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-sm text-green-600"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {imageFile.name}
                  </motion.div>
                )}
              </div>
            </div>

            <Button
              onClick={generateRoutine}
              disabled={isGenerating}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
              size="lg"
            >
              {isGenerating ? (
                <motion.div 
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Your Routine...
                </motion.div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate AI Routine
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Generated Routine Display */}
      <AnimatePresence mode="wait">
        {generatedRoutine && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Card className="border-primary/20 bg-gradient-accent shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Your AI-Generated Routine</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditToggle}
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      {isEditing ? "Preview" : "Edit JSON"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveRoutine}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Routine
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editableRoutine}
                    onChange={(e) => setEditableRoutine(e.target.value)}
                    className="min-h-96 font-mono text-sm"
                    placeholder="Edit your routine JSON here..."
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-xl font-semibold text-primary mb-2">
                        {generatedRoutine.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {generatedRoutine.description}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-medium">Routine Steps</h4>
                      {generatedRoutine.steps?.map((step, index) => (
                        <motion.div
                          key={step.step}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          className="flex gap-4 p-4 bg-background/50 rounded-lg border border-border/50"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                              {step.step}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium mb-1">{step.action}</h5>
                            {step.duration && (
                              <p className="text-sm text-primary">
                                Duration: {step.duration}
                              </p>
                            )}
                            {step.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {step.notes}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No routine message */}
      {!generatedRoutine && !isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center py-12"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Sparkles className="h-16 w-16 text-primary/50 mx-auto mb-4" />
          </motion.div>
          <p className="text-muted-foreground">
            Ready to create your personalized routine? Describe what you have in mind above!
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default RoutineEditor;