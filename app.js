const express = require('express');
const app = express();
const router = express.Router();
require('dotenv').config();
const morgan = require('morgan');
const cors = require('cors');
const deepl = require('deepl-node');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);
const authKey = process.env.DEEPL_KEY; // Replace with your key
const translator = new deepl.Translator(authKey);

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(express.static('build'));

const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

app.use(router);

router.use(bodyParser.json());

router.post('/transcribe', async(req, res, next) => {
    try {
        const whisperInitRawRes = await fetch("https://api.replicate.com/v1/predictions", {
            headers: {
                'Authorization': `Token ${process.env.WHISPER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
                input: { audio: req.body.blobAsB64, language: 'fi', model: 'medium' },
                version: "30414ee7c4fffc37e260fcab7842b5be470b9b840f2b608f5baa9bbef9a259ed",
            })
        });
        const whisperRes = await whisperInitRawRes.json();

        if (whisperRes.urls && whisperRes.urls.get) {
            res.send({ checkIfTranscribingFinishedUrl: whisperRes.urls.get });
        } else throw Error("Initiating transcribing failed.");

    } catch (err) {
        res.status(500).send({ message: 'Error.' });
        next(err);
    }
});

router.get('/image', async(req, res, next) => {
    try {
        let whisperTranscribeRawRes = await fetch(req.query.checkIfTranscribingFinishedUrl, {
            headers: {
                'Authorization': `Token ${process.env.WHISPER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            method: 'GET',
        });

        const whisperTranscribeRes = await whisperTranscribeRawRes.json();

        // Replicate Whisper API gives us an response immediately but the transcribing might not be ready yet.
        // We check if it is ready and return the response accordingly. Front end keeps polling until it gets succeeded status. 
        if (whisperTranscribeRes.status === 'succeeded') {
            const translatedRes = await translator.translateText(whisperTranscribeRes.output.transcription, 'fi', 'en-US');
            const imageRes = await openai.createImage({
                prompt: translatedRes.text,
                n: 1,
                size: "512x512",
            });
            const imageUrl = imageRes.data.data[0].url;

            res.send({ status: 'succeeded', url: imageUrl });
            return;
        };

        if (whisperTranscribeRes.status === 'failed') throw Error("Whisper status request failed.");

        res.send({ status: 'processing' });
    } catch (err) {
        res.status(500).send({ message: 'Error.' });
        next(err);
    }
});