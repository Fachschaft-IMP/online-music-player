const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const app = express();

let parseFile, selectCover;

import('music-metadata').then(module => {
  parseFile = module.parseFile;
  selectCover = module.selectCover;
});

app.use(express.static('public'));

app.get('/songs', async (req, res) => {
  const songsDir = 'C:\\Users\\Drucker\\Music';
  const files = fs.readdirSync(songsDir).filter(file => path.extname(file) === '.mp3');
  const songs = await Promise.all(files.map(async (file) => {
    try {
      const filePath = path.join(songsDir, file);
      const metadata = await parseFile(filePath);
      const cover = selectCover(metadata.common.picture);
      const coverBase64 = cover ? `data:image/jpeg;base64,${cover.data.toString('base64')}` : '';
      return {
        title: metadata.common.title,
        artist: metadata.common.artist,
        album: metadata.common.album,
        cover: coverBase64,
        file: file
      };
    } catch (error) {
      console.error(`Failed to parse file ${file}: ${error.message}`);
      return null;
    }
  }));
  res.send(songs.filter(song => song !== null));
});

app.post('/control', express.json(), (req, res) => {
  const action = req.body.action;
  if (action === 'download') {
    const link = req.body.link;
    const command = `"C:\\Fachschaft\\music-player\\yt-dlp_full_pack\\yt-dlp.exe" -x --audio-format mp3 --add-metadata --embed-thumbnail --write-thumbnail --audio-quality 0 -o "C:\\Users\\Drucker\\Music\\%(title)s.%(ext)s" ${link}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Failed to execute command: ${error.message}`);
        res.status(500).send('Failed to execute command');
      } else {
        res.send('Command executed');
      }
    });
  } else if (action === 'play') {
    const command = req.body.command;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Failed to execute command: ${error.message}`);
        res.status(500).send('Failed to execute command');
      } else {
        res.send('Command executed');
      }
    });
  } else {
    const commandPath = 'C:\\Fachschaft\\music-player\\control-player\\command';
    const commandFile = `${commandPath}\\${action}`;
    fs.writeFile(commandFile, '', (err) => {
      if (err) {
        console.error(`Failed to write command file: ${err.message}`);
        res.status(500).send('Failed to write command file');
      } else {
        res.send('Command file written');
      }
    });
  }
});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
