
import React, { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2, Sparkles, Brain, Camera, Speaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIResponse {
  question: string;
  explanation: string;
  image_url: string;
  audio_url: string;
}

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        await sendAudioToBackend(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "🎤 Recording started!",
        description: "Ask your question now...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not start recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsLoading(true);
      
      toast({
        title: "🔄 Processing...",
        description: "Thinking about your question!",
      });
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    try {
      console.log('Sending audio to Supabase Edge Function...');
      
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');

      // Use Supabase Edge Function instead of localhost
      const { data, error } = await supabase.functions.invoke('process-audio', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('Response received:', data);
      setResponse(data);
      
      toast({
        title: "✨ Got your answer!",
        description: "Check out what I found for you!",
      });
    } catch (error) {
      console.error('Error sending audio:', error);
      toast({
        title: "Error",
        description: "Sorry, I couldn't process your question. Try again!",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = () => {
    if (response?.audio_url) {
      const audio = new Audio(response.audio_url);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        toast({
          title: "Audio Error",
          description: "Could not play the audio response.",
          variant: "destructive",
        });
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="animate-bounce">
              <Sparkles className="w-12 h-12 text-yellow-500" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
              Toddler AI
            </h1>
            <div className="animate-bounce delay-150">
              <Brain className="w-12 h-12 text-pink-500" />
            </div>
          </div>
          <p className="text-2xl text-gray-700 font-medium bg-white/50 rounded-full px-6 py-3 inline-block shadow-lg">
            Ask me anything and I'll explain it in a fun way! 🌟✨
          </p>
        </div>

        {/* Enhanced Recording Section */}
        <Card className="mb-8 border-0 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-10 text-center relative">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 w-8 h-8 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="absolute top-8 right-8 w-6 h-6 bg-pink-400 rounded-full animate-pulse delay-300"></div>
              <div className="absolute bottom-8 left-8 w-4 h-4 bg-blue-400 rounded-full animate-pulse delay-700"></div>
              <div className="absolute bottom-4 right-4 w-10 h-10 bg-purple-400 rounded-full animate-pulse delay-500"></div>
            </div>
            
            <div className="mb-8 relative z-10">
              <div className={`relative inline-flex items-center justify-center w-40 h-40 rounded-full transition-all duration-500 transform ${
                isRecording 
                  ? 'bg-gradient-to-r from-red-400 to-red-600 shadow-2xl shadow-red-300 animate-pulse scale-110' 
                  : isLoading
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-2xl shadow-yellow-300 animate-spin'
                  : 'bg-gradient-to-r from-green-400 to-green-600 shadow-2xl shadow-green-300 hover:shadow-3xl hover:scale-105'
              }`}>
                {/* Outer glow ring */}
                <div className={`absolute inset-0 rounded-full ${
                  isRecording ? 'animate-ping bg-red-400' : 
                  isLoading ? 'animate-spin bg-yellow-400' : 
                  'bg-green-400 group-hover:animate-pulse'
                } opacity-20`}></div>
                
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className={`w-32 h-32 rounded-full text-white font-bold text-xl border-0 transition-all duration-300 shadow-lg ${
                    isRecording 
                      ? 'bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800' 
                      : isLoading
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-16 h-16 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-16 h-16" />
                  ) : (
                    <Mic className="w-16 h-16" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-3 relative z-10">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <Brain className="w-8 h-8 text-yellow-500 animate-bounce" />
                    🤔 Thinking...
                    <Sparkles className="w-8 h-8 text-yellow-500 animate-bounce delay-100" />
                  </>
                ) : isRecording ? (
                  <>
                    <Mic className="w-8 h-8 text-red-500 animate-pulse" />
                    🎤 Listening...
                    <div className="flex gap-1">
                      <div className="w-2 h-6 bg-red-500 rounded animate-pulse"></div>
                      <div className="w-2 h-8 bg-red-400 rounded animate-pulse delay-100"></div>
                      <div className="w-2 h-6 bg-red-500 rounded animate-pulse delay-200"></div>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-8 h-8 text-green-500" />
                    👆 Press to Ask!
                    <Brain className="w-8 h-8 text-green-500" />
                  </>
                )}
              </h2>
              <p className="text-gray-600 text-xl font-medium">
                {isLoading ? 'Getting you an awesome answer! 🚀' : 
                 isRecording ? 'Say your question clearly and loudly! 📢' : 
                 'Tap the microphone and ask me anything you want to know! 🎯'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Response Section */}
        {response && (
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Question */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border-l-6 border-blue-400 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <Mic className="w-6 h-6" />
                    🗣️ Your Question:
                  </h3>
                  <p className="text-blue-700 text-lg font-medium">{response.question}</p>
                </div>

                {/* Explanation */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border-l-6 border-green-400 shadow-lg">
                  <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                    <Brain className="w-6 h-6" />
                    🧠 Here's what I know:
                  </h3>
                  <p className="text-green-700 text-lg leading-relaxed font-medium">{response.explanation}</p>
                </div>

                {/* Image */}
                {response.image_url && (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-2xl border-l-6 border-yellow-400 shadow-lg">
                    <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
                      <Camera className="w-6 h-6" />
                      🎨 Picture Time:
                    </h3>
                    <div className="flex justify-center">
                      <img 
                        src={response.image_url} 
                        alt="Illustration for your question"
                        className="max-w-full h-72 object-contain rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 border-4 border-white"
                        onError={(e) => {
                          console.error('Image failed to load:', response.image_url);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Audio Player */}
                {response.audio_url && (
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-2xl border-l-6 border-purple-400 shadow-lg">
                    <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                      <Speaker className="w-6 h-6" />
                      🔊 Listen to Me:
                    </h3>
                    <div className="flex justify-center">
                      <Button
                        onClick={playAudio}
                        className="bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-4 px-10 rounded-full text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Volume2 className="w-6 h-6 mr-3" />
                        🎵 Play Audio
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Footer */}
        <div className="text-center mt-8 pb-8">
          <div className="bg-white/70 rounded-full px-8 py-4 inline-block shadow-lg">
            <p className="text-gray-700 text-xl font-medium flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Keep asking questions! Learning is fun! 
              <Brain className="w-6 h-6 text-pink-500" />
              🚀
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
