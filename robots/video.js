const ffmpeg = require('fluent-ffmpeg');
const state = require('./state.js');
const path = require('path');
const rootPath = path.resolve(__dirname, '..');

const fromRoot = (relPath) => path.resolve(rootPath, relPath);

async function robot() {
  console.log('> [video-robot] Starting...');
  const content = state.load();

  await convertAllImages(content);
  await createAllSentenceImages(content);
  await createYouTubeThumbnail();
  await createFFMPEGVideo(content);

  state.save(content);

  async function convertAllImages(content) {
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      await convertImage(sentenceIndex);
    }
  }

  async function convertImage(sentenceIndex) {
    return new Promise((resolve, reject) => {
      const inputFile = fromRoot(`./content/${sentenceIndex}-original.png`);
      const outputFile = fromRoot(`./content/${sentenceIndex}-converted.png`);
      const width = 1920;
      const height = 1080;

      ffmpeg(inputFile)
        .outputOptions([
          '-vf',
          `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
        ])
        .save(outputFile)
        .on('end', () => {
          console.log(`> [video-robot] Image converted: ${outputFile}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`> [video-robot] Error converting image: ${err.message}`);
          reject(err);
        });
    });
  }

  async function createAllSentenceImages(content) {
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text);
    }
  }

  async function createSentenceImage(sentenceIndex, sentenceText) {
    return new Promise((resolve, reject) => {
      const outputFile = fromRoot(`./content/${sentenceIndex}-sentence.png`);

      const templateSettings = {
        0: {
          size: '1920x400',
          gravity: 'center',
        },
        1: {
          size: '1920x1080',
          gravity: 'center',
        },
        2: {
          size: '800x1080',
          gravity: 'west',
        },
        3: {
          size: '1920x400',
          gravity: 'center',
        },
        4: {
          size: '1920x1080',
          gravity: 'center',
        },
        5: {
          size: '800x1080',
          gravity: 'west',
        },
        6: {
          size: '1920x400',
          gravity: 'center',
        },
      };

      ffmpeg()
        .input('color=black:s=1920x1080:d=5')
        .input('anullsrc')
        .complexFilter([
          {
            filter: 'drawtext',
            options: {
              fontfile: '/path/to/font.ttf',
              text: sentenceText,
              fontsize: 48,
              fontcolor: 'white',
              x: '(main_w/2-text_w/2)',
              y: '(main_h/2-text_h/2)',
            },
          },
        ])
        .save(outputFile)
        .on('end', () => {
          console.log(`> [video-robot] Sentence created: ${outputFile}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`> [video-robot] Error creating sentence image: ${err.message}`);
          reject(err);
        });
    });
  }

  async function createYouTubeThumbnail() {
    return new Promise((resolve, reject) => {
      const inputFile = fromRoot('./content/0-converted.png');
      const outputFile = fromRoot('./content/youtube-thumbnail.jpg');

      ffmpeg(inputFile)
        .outputOptions(['-vf', 'scale=1280:720'])
        .save(outputFile)
        .on('end', () => {
          console.log('> [video-robot] YouTube thumbnail created');
          resolve();
        })
        .on('error', (err) => {
          console.error(`> [video-robot] Error creating YouTube thumbnail: ${err.message}`);
          reject(err);
        });
    });
  }

  async function createFFMPEGVideo(content) {
    return new Promise((resolve, reject) => {
      const outputFile = fromRoot('./content/output.mp4');
      const inputFiles = content.sentences.map((_, index) => fromRoot(`./content/${index}-converted.png`));
      const inputOptions = inputFiles.map((file) => `-loop 1 -t 5 -i ${file}`).join(' ');

      const ffmpegCommand = `ffmpeg ${inputOptions} -filter_complex "[0:v][1:v][2:v][3:v][4:v][5:v][6:v]concat=n=7:v=1:a=0,format=yuv420p[v]" -map "[v]" ${outputFile}`;

      require('child_process').exec(ffmpegCommand, (err, stdout, stderr) => {
        if (err) {
          console.error(`> [video-robot] Error creating video: ${err.message}`);
          reject(err);
        } else {
          console.log('> [video-robot] Video created');
          resolve();
        }
      });
    });
  }
}

module.exports = robot;
