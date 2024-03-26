# Say-See backend

Say See is a (outdated) mini app developed at the end of year 2022. It was made for my relatives' kids. It leverages multiple third-party AI services.

The main feature is that you speak to it in any language using your device's microphone and it will generate an image based on what you said. The image can be shared to WhatsApp with a click of a button.

The app leverages Whisper automatic speech recognition AI model for audio to text speech transcription. Whisper AI model is used through Replicate's API.
After transcribing makes a call to DeepL API for AI enhanced translation to English.
At the end it calls OpenAI's Dalle-2 API which generates an image based on the transcribed and translated text.
The image is then shown in the UI.

The app was deployed to Heroku.

[Link to Say See frontend repository](https://github.com/SebaSeba/say-see)

![Say See high level architecture](https://github.com/SebaSeba/say-see/blob/master/say-see.jpg)
