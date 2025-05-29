
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing audio request...');
    
    const formData = await req.formData();
    const audioFile = formData.get('audio_file') as File;
    
    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    console.log('Audio file received:', audioFile.name, audioFile.size);

    // Convert audio to text using OpenAI Whisper
    const question = await transcribeAudio(audioFile);
    console.log('Transcribed question:', question);

    // Generate AI response using OpenAI
    const aiResponse = await generateAIResponse(question);
    console.log('AI response generated');

    // Get cartoon image from Pixabay
    const imageUrl = await getCartoonImage(question);
    console.log('Image URL:', imageUrl);

    // Generate TTS audio using ElevenLabs
    const audioUrl = await generateTTSAudio(aiResponse);
    console.log('Audio URL:', audioUrl);

    const response = {
      question: question,
      explanation: aiResponse,
      image_url: imageUrl,
      audio_url: audioUrl
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing audio:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Sorry, I couldn\'t process your question. Please try again!',
        details: error.message 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function transcribeAudio(audioFile: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI Whisper API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.text || 'Could not understand the question';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return 'What is a rainbow?'; // fallback question
  }
}

async function generateAIResponse(question: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a cheerful, educational AI assistant for toddlers. Explain things in simple, fun language that a 2-4 year old can understand. Use emojis and keep responses short (2-3 sentences). Always be positive and encouraging!'
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || 'That\'s a wonderful question! Learning new things is so much fun! 🌟';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'That\'s a wonderful question! Learning new things is so much fun! 🌟';
  }
}

async function getCartoonImage(question: string): Promise<string> {
  try {
    // Extract keywords from question for better image search
    const keywords = extractKeywords(question);
    const searchQuery = `${keywords} cartoon illustration for kids`;
    
    const response = await fetch(
      `https://pixabay.com/api/?key=50572087-fbb5dc460b4c14ab7e80d2ac1&q=${encodeURIComponent(searchQuery)}&image_type=illustration&category=education&safesearch=true&min_width=400&per_page=10`
    );

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.hits && result.hits.length > 0) {
      // Return a random image from the results
      const randomIndex = Math.floor(Math.random() * result.hits.length);
      return result.hits[randomIndex].webformatURL;
    } else {
      // Fallback to a default educational image
      return "https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=🌈+Learning+Fun";
    }
  } catch (error) {
    console.error('Error fetching image:', error);
    return "https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=🌈+Learning+Fun";
  }
}

function extractKeywords(question: string): string {
  // Simple keyword extraction for better image search
  const commonWords = ['what', 'is', 'are', 'how', 'why', 'where', 'when', 'a', 'an', 'the', 'do', 'does', 'can', 'will'];
  const words = question.toLowerCase().split(' ').filter(word => 
    word.length > 2 && !commonWords.includes(word)
  );
  return words.slice(0, 3).join(' ') || 'learning education';
}

async function generateTTSAudio(text: string): Promise<string> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/9BWtsMINqrJLrRacOk9x', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': 'sk_9d51ab0b843fc2f51c95bb6e9abed1db664757639b2ad72a',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    // Convert audio to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Return as data URL that can be played directly
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('Error generating TTS audio:', error);
    // Return a fallback audio notification sound
    return "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav";
  }
}
