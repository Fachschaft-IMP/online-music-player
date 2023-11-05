fetch('songs')
  .then(response = response.json())
  .then(songs = {
    const songsDiv = document.getElementById('songs');
    songs.forEach(song = {
      const songDiv = document.createElement('div');
      songDiv.innerHTML = `
        h2${song.title}h2
        p${song.artist}p
        p${song.album}p
        img src=${song.cover} alt=${song.title}
      `;
      songsDiv.appendChild(songDiv);
    });
  });
