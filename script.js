document.addEventListener('DOMContentLoaded', () => {
    // --- 설정 영역 ---
    const API_KEY = '$2a$10$BGtY5JIOZO3YmoIJFFYEVuBFmoTXtvpz1HdlF9OZPyHBjkcxp8BBC';
    const BIN_ID = '68ca43afd0ea881f40809888';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
    
    // --- 전역 변수 ---
    const ideasContainer = document.getElementById('ideas-container');
    const statusContainer = document.getElementById('vote-status');
    const dateContainer = document.getElementById('vote-date');
    let fullData = {}; 

    // --- 핵심 함수 ---
    async function loadDataAndRender() {
        try {
            const response = await fetch(`${JSONBIN_URL}/latest`, { 
                cache: 'no-cache',
                headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': false } 
            });
            if (!response.ok) throw new Error('Failed to load data');
            fullData = await response.json();
            if (!fullData || !fullData.voteConfig || !fullData.ideas || !fullData.votes) {
                throw new Error("JSONBin 데이터 구조가 올바르지 않습니다.");
            }
            renderPage();
        } catch (error) {
            console.error("데이터 로딩 실패:", error);
            ideasContainer.innerHTML = '<p class="loading">데이터 로딩에 실패했습니다. 새로고침 해주세요.</p>';
            statusContainer.textContent = '데이터 로딩 중 문제가 발생했습니다.'; 
        }
    }

    async function saveData() {
        try {
            await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(fullData)
            });
        } catch (error) {
            console.error("데이터 저장 실패:", error);
        }
    }

    function renderPage() {
        if (!fullData.voteConfig) return; 

        const { voteConfig, ideas, votes } = fullData;
        dateContainer.textContent = voteConfig.date || '';
        
        // [수정된 부분] votedIdsKey를 voteConfig에서 가져오지 않고, endTime을 기준으로 동적으로 생성합니다.
        const votedIdsKey = `gidoMetaVotedIds-${voteConfig.endTime}`;
        
        const now = new Date();
        const startTime = new Date(voteConfig.startTime);
        const endTime = new Date(voteConfig.endTime);
        const isVotingActive = now >= startTime && now <= endTime;
        
        if (now < startTime) {
            statusContainer.textContent = `투표는 ${voteConfig.startTime.replace('T', ' ')}부터 시작됩니다.`;
        } else if (now > endTime) {
            statusContainer.textContent = `투표가 마감되었습니다.`;
        } else {
            statusContainer.textContent = '👇 마음에 드는 아이디어 2개에 투표하세요! 👇';
        }

        ideasContainer.innerHTML = ''; 
        const votedIds = JSON.parse(localStorage.getItem(votedIdsKey)) || [];

        ideas.forEach(idea => {
            const voteCount = votes[`idea_${idea.id}`] || 0;
            const isVoted = votedIds.includes(idea.id);
            const buttonText = isVoted ? '투표 취소' : '투표하기';
            const buttonClass = `vote-button ${isVoted ? 'voted' : ''} ${!isVotingActive ? 'disabled-btn' : ''}`;

            const card = document.createElement('div');
            card.className = 'idea-card';
            card.innerHTML = `
                <p class="idea-text">💡 ${idea.text}</p>
                <div class="vote-area">
                    <button class="${buttonClass}" data-id="${idea.id}">${buttonText}</button>
                    <p class="vote-count">현재 득표: ${'🏆'.repeat(voteCount)} (${voteCount})</p>
                </div>
            `;
            ideasContainer.appendChild(card);
        });

        document.querySelectorAll('.vote-button').forEach(button => {
            button.addEventListener('click', handleVote);
        });
    }

    function handleVote(event) {
        if (!fullData.voteConfig) return; 
        
        const { voteConfig, votes } = fullData;
        
        // [수정된 부분] votedIdsKey를 voteConfig에서 가져오지 않고, endTime을 기준으로 동적으로 생성합니다.
        const votedIdsKey = `gidoMetaVotedIds-${voteConfig.endTime}`;
        
        const now = new Date();
        const startTime = new Date(voteConfig.startTime);
        const endTime = new Date(voteConfig.endTime);

        if (now < startTime) {
            alert(`투표는 ${voteConfig.startTime.replace('T', ' ')}부터 시작됩니다.`);
            return;
        }
        if (now > endTime) {
            alert('투표가 마감되었습니다.');
            return;
        }

        const clickedId = parseInt(event.target.dataset.id);
        let votedIds = JSON.parse(localStorage.getItem(votedIdsKey)) || [];
        const isAlreadyVoted = votedIds.includes(clickedId);
        
        if (isAlreadyVoted) {
            votes[`idea_${clickedId}`] = (votes[`idea_${clickedId}`] || 1) - 1;
            votedIds = votedIds.filter(id => id !== clickedId);
        } else {
            if (votedIds.length >= 2) {
                alert('최대 2개까지만 투표할 수 있습니다!');
                return;
            }
            votes[`idea_${clickedId}`] = (votes[`idea_${clickedId}`] || 0) + 1;
            votedIds.push(clickedId);
        }
        
        localStorage.setItem(votedIdsKey, JSON.stringify(votedIds));
        renderPage(); 
        saveData();   
    }

    loadDataAndRender();
});
