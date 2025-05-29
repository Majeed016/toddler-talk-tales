
import React, { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

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
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');

      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data: AIResponse = await response.json();
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
      const audio = new Audio(`http://localhost:8000${response.audio_url}`);
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
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-5xl font-bold text-purple-600 mb-4">
            🤖 Toddler AI
          </h1>
          <p className="text-xl text-gray-700 font-medium">
            Ask me anything and I'll explain it in a fun way! 🌟
          </p>
        </div>

        {/* Recording Section */}
        <Card className="mb-8 border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 shadow-lg shadow-red-300 animate-pulse' 
                  : 'bg-green-500 shadow-lg shadow-green-300 hover:shadow-xl'
              }`}>
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className={`w-full h-full rounded-full text-white font-bold text-lg border-0 transition-all duration-300 ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-12 h-12" />
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">
                {isLoading ? '🤔 Thinking...' : isRecording ? '🎤 Listening...' : '👆 Press to Ask!'}
              </h2>
              <p className="text-gray-600 text-lg">
                {isLoading ? 'Getting you an awesome answer!' : isRecording ? 'Say your question clearly' : 'Tap the microphone and ask me anything!'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Response Section */}
        {response && (
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Question */}
                <div className="bg-blue-50 p-4 rounded-2xl border-l-4 border-blue-400">
                  <h3 className="text-lg font-bold text-blue-800 mb-2">🗣️ Your Question:</h3>
                  <p className="text-blue-700 text-lg">{response.question}</p>
                </div>

                {/* Explanation */}
                <div className="bg-green-50 p-6 rounded-2xl border-l-4 border-green-400">
                  <h3 className="text-xl font-bold text-green-800 mb-3">🧠 Here's what I know:</h3>
                  <p className="text-green-700 text-lg leading-relaxed">{response.explanation}</p>
                </div>

                {/* Image */}
                {response.image_url && (
                  <div className="bg-yellow-50 p-6 rounded-2xl border-l-4 border-yellow-400">
                    <h3 className="text-xl font-bold text-yellow-800 mb-4">🎨 Picture Time:</h3>
                    <div className="flex justify-center">
                      <img 
                        src={response.image_url} 
                        alt="Illustration for your question"
                        className="max-w-full h-64 object-contain rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
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
                  <div className="bg-purple-50 p-6 rounded-2xl border-l-4 border-purple-400">
                    <h3 className="text-xl font-bold text-purple-800 mb-4">🔊 Listen to Me:</h3>
                    <div className="flex justify-center">
                      <Button
                        onClick={playAudio}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Volume2 className="w-6 h-6 mr-2" />
                        Play Audio
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <p className="text-gray-600 text-lg">
            Keep asking questions! Learning is fun! 🚀
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
