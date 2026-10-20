(async function() {
  if (document.getElementById('othello-modal')) {
    alert('すでにオセロ画面が開いています！');
    return;
  }

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
  const { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

  const firebaseConfig = {
    apiKey: "AIzaSyDKMaSa_SBWQmM9ud52TeXP10SOw4Nz04",
    authDomain: "akull-831bl.firebaseapp.com",
    projectId: "akull-831bl",
    storageBucket: "akull-831bl.firebasestorage.app",
    messagingSenderId: "28365940765",
    appId: "1:28365940765:web:6f23ab7454e6476801bef4",
    measurementId: "G-H86N3B2PDD"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const container = document.createElement('div');
  container.id = 'othello-modal';
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;';
  
  container.innerHTML = `
    <div style="background:#222;padding:20px;border-radius:12px;text-align:center;max-width:95%;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
      <h2 style="margin-top:0;">オンラインオセロ</h2>
      <div id="othello-lobby" style="margin-bottom:15px;">
        <input type="text" id="othello-room" placeholder="ルームID (例: room1)" style="padding:10px;font-size:16px;border-radius:6px;border:none;margin-right:5px;width:180px;">
        <button id="othello-join" style="padding:10px 15px;font-size:16px;background:#4CAF50;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">参加・作成</button>
      </div>
      <div id="othello-game-area" style="display:none;">
        <p id="othello-status" style="font-size:15px;margin-bottom:10px;line-height:1.4;"></p>
        <div id="othello-board" style="display:grid;grid-template-columns:repeat(8, 36px);grid-template-rows:repeat(8, 36px);gap:2px;background:#1b5e20;padding:6px;border-radius:6px;margin:0 auto 15px auto;width:fit-content;"></div>
        <button id="othello-close-ingame" style="padding:8px 15px;background:#f44336;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">ゲームを終了</button>
      </div>
      <button id="othello-close" style="padding:6px 12px;background:#555;color:#fff;border:none;border-radius:6px;margin-top:10px;font-size:13px;cursor:pointer;">閉じる</button>
    </div>
  `;
  document.body.appendChild(container);

  document.getElementById('othello-close').onclick = () => container.remove();
  document.getElementById('othello-close-ingame').onclick = () => container.remove();

  let currentGameId = null;
  let myColor = null; 

  document.getElementById('othello-join').onclick = async () => {
    const roomId = document.getElementById('othello-room').value.trim();
    if (!roomId) {
      alert('ルームIDを入力してください！');
      return;
    }
    currentGameId = roomId;
    const docRef = doc(db, "games", roomId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      myColor = 'black';
      const initialBoard = Array(64).fill(null);
      initialBoard[27] = 'white';
      initialBoard[28] = 'black';
      initialBoard[35] = 'black';
      initialBoard[36] = 'white';

      await setDoc(docRef, {
        board: initialBoard,
        turn: 'black',
        black: true,
        white: false
      });
    } else {
      const data = docSnap.data();
      if (!data.white) {
        myColor = 'white';
        await updateDoc(docRef, { white: true });
      } else {
        myColor = 'spectator';
        alert('この部屋はすでに満員のため、観戦モードで参加します。');
      }
    }

    document.getElementById('othello-lobby').style.display = 'none';
    document.getElementById('othello-game-area').style.display = 'block';

    onSnapshot(docRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        updateGameUI(docSnapshot.data());
      }
    });
  };

  function updateGameUI(data) {
    const boardEl = document.getElementById('othello-board');
    boardEl.innerHTML = '';
    const statusEl = document.getElementById('othello-status');

    statusEl.innerHTML = `あなたの担当: <b>${myColor === 'black' ? '黒（先手）' : myColor === 'white' ? '白（後手）' : '観戦者'}</b><br>` +
                         `現在のターン: <b>${data.turn === 'black' ? '黒' : '白'}</b>`;

    data.board.forEach((cell, index) => {
      const cellEl = document.createElement('div');
      cellEl.style.cssText = 'background:#2e7d32;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:2px;';
      
      if (cell) {
        const disc = document.createElement('div');
        disc.style.cssText = `width:28px;height:28px;border-radius:50%;background:${cell === 'black' ? '#000' : '#fff'};box-shadow:0 2px 4px rgba(0,0,0,0.4);`;
        cellEl.appendChild(disc);
      }

      cellEl.onclick = () => makeMove(index, data);
      boardEl.appendChild(cellEl);
    });
  }

  async function makeMove(index, data) {
    if (data.turn !== myColor) {
      alert('あなたのターンではありません！');
      return;
    }
    if (data.board[index] !== null) {
      alert('そこにはすでに石があります！');
      return;
    }

    const newBoard = [...data.board];
    const flipped = getFlippedDiscs(newBoard, index, myColor);
    if (flipped.length === 0) {
      alert('相手の石を挟める場所にしか置けません！');
      return;
    }

    newBoard[index] = myColor;
    flipped.forEach(i => {
      newBoard[i] = myColor;
    });

    const nextTurn = myColor === 'black' ? 'white' : 'black';
    const docRef = doc(db, "games", currentGameId);
    await updateDoc(docRef, {
      board: newBoard,
      turn: nextTurn
    });
  }

  function getFlippedDiscs(board, index, color) {
    if (board[index] !== null) return [];
    const opponent = color === 'black' ? 'white' : 'black';
    const row = Math.floor(index / 8);
    const col = index % 8;
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    let totalFlipped = [];

    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      let tempFlipped = [];
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const idx = r * 8 + c;
        if (board[idx] === opponent) {
          tempFlipped.push(idx);
        } else if (board[idx] === color) {
          if (tempFlipped.length > 0) {
            totalFlipped.push(...tempFlipped);
          }
          break;
        } else {
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return totalFlipped;
  }
})();
