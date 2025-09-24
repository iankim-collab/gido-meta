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
            // 캐시를 무시하고 항상 최신 데이터를 가져오도록 설정
            const response = await fetch(`${JSONBIN_URL}/latest`, { 
                cache: 'no-cache', // 캐시 미사용 설정
                headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': false } 
            });

            if (!response.ok) {
                // HTTP 오류 응답을 상세하게 로깅
                const errorText = await response.text();
                throw new Error(`Failed to load data: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            fullData = await response.json();
            
            // 데이터 구조 유효성 검사 추가
            if (!fullData || !fullData.voteConfig || !fullData.ideas || !fullData.votes) {
                throw new Error("JSONBin 데이터 구조가 올바르지 않습니다. 'voteConfig', 'ideas', 'votes' 키가 필요합니다.");
            }

            renderPage();
        } catch (error) {
            console.error("데이터 로딩 실패:", error);
            ideasContainer.innerHTML = '<p class="loading">데이터 로딩에 실패했습니다. 새로고침 해주세요.</p>';
            statusContainer.textContent = '데이터 로딩 중 문제가 발생했습니다.'; // 상태 메시지 업데이트
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
        // 데이터가 아직 로딩되지 않았거나 유효하지 않으면 렌더링 중단
        if (!fullData || !fullData.voteConfig || !fullData.ideas || !fullData.votes) {
            // loadDataAndRender에서 이미 에러 메시지를 띄웠으므로 여기서는 추가 작업 불필요
            return; 
        }

        const { voteConfig, ideas, votes } = fullData;
        dateContainer.textContent = voteConfig.date || '';
        
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

        ideasContainer.innerHTML = ''; // 기존 내용 지우고 새로 그리기
        const votedIds = JSON.parse(localStorage.getItem(voteConfig.votedIdsKey)) || [];

        ideas.forEach(idea => {
            const voteCount = votes[`idea_${idea.id}`] || 0;
            const isVoted = votedIds.includes(idea.id);
            const buttonText = isVoted ? '투표 취소' : '투표하기';
            const buttonClass = isVoted ? 'vote-button voted' : 'vote-button';

            const card = document.createElement('div');
            card.className = 'idea-card';
            card.innerHTML = `
                <p class="idea-text">💡 ${idea.text}</p>
                <div class="vote-area">
                    <button class="${buttonClass}" data-id="${idea.id}" ${!isVotingActive ? 'disabled' : ''}>${buttonText}</button>
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
        // 데이터가 없으면 투표 처리 중단
        if (!fullData || !fullData.voteConfig || !fullData.votes) return; 
        
        const { voteConfig, votes } = fullData;
        const now = new Date();
        const startTime = new Date(voteConfig.startTime);
        const endTime = new Date(voteConfig.endTime);

        // [수정된 부분] 투표 기간인지 먼저 확인하고, 아니면 안내 메시지(alert) 표시
        if (now < startTime) {
            alert(`투표는 ${voteConfig.startTime.replace('T', ' ')}부터 시작됩니다.`);
            return;
        }
        if (now > endTime) {
            alert('투표가 마감되었습니다.');
            return;
        }

        const clickedId = parseInt(event.target.dataset.id);
        let votedIds = JSON.parse(localStorage.getItem(voteConfig.votedIdsKey)) || [];
        const isAlreadyVoted = votedIds.includes(clickedId);
        
        if (isAlreadyVoted) { // 투표 취소
            votes[`idea_${clickedId}`] = (votes[`idea_${clickedId}`] || 1) - 1;
            votedIds = votedIds.filter(id => id !== clickedId);
        } else { // 신규 투표
            if (votedIds.length >= 2) {
                alert('최대 2개까지만 투표할 수 있습니다!');
                return;
            }
            votes[`idea_${clickedId}`] = (votes[`idea_${clickedId}`] || 0) + 1;
            votedIds.push(clickedId);
        }
        
        localStorage.setItem(voteConfig.votedIdsKey, JSON.stringify(votedIds));
        renderPage(); // 화면 업데이트
        saveData();   // 서버에 저장
    }

    loadDataAndRender();
});
