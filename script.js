document.addEventListener('DOMContentLoaded', () => {
    // --- [중요!] 전달주신 API Key와 Bin ID를 반영했습니다. ---
    const API_KEY = '$2a$10$BGtY5JIOZO3YmoIJFFYEVuBFmoTXtvpz1HdlF9OZPyHBjkcxp8BBC';
    const BIN_ID = '68ca43afd0ea881f40809888';
    // --------------------------------------------------------------------

    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
    
    const initialIdeas = [
        { id: 1, text: "푸시 메시지에 이모지(✨)를 추가하면 오픈율이 10% 오를 것 같아요!" },
        { id: 2, text: "인스타 광고 문구를 '~제공' 대신 '~챙겨가세요'로 바꾸면 클릭률이 오를 것 같아요!" },
        { id: 3, text: "매주 금요일에 '이번 주말 빈방' 리스트를 스토리로 올리면 즉흥 예약이 늘 것 같아요!" },
        { id: 4, text: "노티플라이를 통해, 고객이 앱 이탈할 때 특가 객실 팝업 띄워주면 체류시간이 늘 것 같아요!" }
        { id: 5, text: "팀 미팅 PDCA 작성할 때 지금까지 진행 상황에 대해 별표시로 자평 하는 한 줄이 있으면 다른 사람들도 상황 파악이 쉬울 것 같아요!" }
    ];

    const ideasContainer = document.getElementById('ideas-container');
    const votedIdsKey = `gidoMetaVotedIds-${BIN_ID}`; // Bin ID를 사용해 고유 키 생성

    let ideas = initialIdeas.map(idea => ({ ...idea, votes: 0 }));

    async function loadVotes() {
        try {
            const response = await fetch(`${JSONBIN_URL}/latest`, { 
                headers: { 'X-Master-Key': API_KEY } 
            });
            if (!response.ok) throw new Error('Failed to load votes');
            const data = await response.json();
            ideas = ideas.map(idea => ({
                ...idea,
                votes: data.record[`idea_${idea.id}`] || 0
            }));
        } catch (error) {
            console.error("득표수 로딩 실패:", error);
        } finally {
            renderIdeas();
        }
    }

    async function saveVotes() {
        const voteCounts = ideas.reduce((acc, idea) => {
            acc[`idea_${idea.id}`] = idea.votes;
            return acc;
        }, {});
        try {
            await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(voteCounts)
            });
        } catch (error) {
            console.error("득표수 저장 실패:", error);
        }
    }

    function renderIdeas() {
        ideasContainer.innerHTML = '';
        const votedIds = JSON.parse(localStorage.getItem(votedIdsKey)) || [];

        ideas.forEach(idea => {
            const isVoted = votedIds.includes(idea.id);
            const buttonText = isVoted ? '투표 취소' : '투표하기';
            const buttonClass = isVoted ? 'vote-button voted' : 'vote-button';

            const card = document.createElement('div');
            card.className = 'idea-card';
            card.innerHTML = `
                <p class="idea-text">💡 ${idea.text}</p>
                <div class="vote-area">
                    <button class="${buttonClass}" data-id="${idea.id}">${buttonText}</button>
                    <p class="vote-count">현재 득표: ${'🏆'.repeat(idea.votes)} (${idea.votes})</p>
                </div>
            `;
            ideasContainer.appendChild(card);
        });

        document.querySelectorAll('.vote-button').forEach(button => {
            button.addEventListener('click', handleVote);
        });
    }

    function handleVote(event) {
        const clickedId = parseInt(event.target.dataset.id);
        let votedIds = JSON.parse(localStorage.getItem(votedIdsKey)) || [];
        const ideaInDb = ideas.find(i => i.id === clickedId);
        if (!ideaInDb) return;

        const isAlreadyVoted = votedIds.includes(clickedId);
        if (isAlreadyVoted) {
            if (ideaInDb.votes > 0) ideaInDb.votes--;
            votedIds = votedIds.filter(id => id !== clickedId);
        } else {
            if (votedIds.length >= 2) {
                alert('최대 2개까지만 투표할 수 있습니다!');
                return;
            }
            ideaInDb.votes++;
            votedIds.push(clickedId);
        }
        
        localStorage.setItem(votedIdsKey, JSON.stringify(votedIds));
        renderIdeas(); // 화면 즉시 업데이트
        saveVotes();   // 서버에 저장 (백그라운드)
    }

    loadVotes();
});
