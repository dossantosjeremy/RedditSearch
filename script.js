const CHATGPT_API_KEY = "sk-proj-P24Cqp80iUUcysSvkMuzT3BlbkFJMeHrQZmdigKnDRLwjast";
const CHATGPT_API_URL = "https://api.openai.com/v1/chat/completions";
const SYNONYMS_API_URL = "https://api.datamuse.com/words?rel_syn=";

async function searchReddit() {
    const searchTerm = document.getElementById('searchTerm').value;
    const synonyms = await getSynonyms(searchTerm);
    const terms = [searchTerm, ...synonyms].join(' OR ');
    const url = `https://www.reddit.com/search.json?q=${terms}`;

    const response = await fetch(url);
    const data = await response.json();
    displayResults(data.data.children, searchTerm);
    analyzeResults(data.data.children);
}

async function getSynonyms(term) {
    const response = await fetch(`${SYNONYMS_API_URL}${term}`);
    const data = await response.json();
    return data.slice(0, 5).map(item => item.word); // Get top 5 synonyms
}

function displayResults(posts, searchTerm) {
    const results = document.getElementById('results');
    results.innerHTML = `<h2>Results for: "${searchTerm}"</h2>`;

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.innerHTML = `
            <a href="https://www.reddit.com${post.data.permalink}" target="_blank">
                <h3>${post.data.title}</h3>
            </a>
            <p>${post.data.selftext}</p>
            <p>Score: ${post.data.score}</p>
            <div class="analysis" id="analysis-${post.data.id}">
                <div class="quote">"${post.data.selftext}"</div>
            </div>
        `;
        results.appendChild(postElement);
        showPostAnalysis(post.data);
    });
}

async function analyzeResults(posts) {
    const combinedText = posts.map(post => post.data.title + ' ' + post.data.selftext).join('\n\n');
    const analysis = await getChatGPTAnalysis(combinedText, `Provide UX insights with quotes, recommendations, and opportunities to improve based on the following Reddit posts. Format each insight as a complete sentence and provide a problem statement using the 5 whys and H method. Include quotes for each insight. `);
    displayDetailedAnalysis(analysis, posts);
}

async function getChatGPTAnalysis(text, prompt) {
    const response = await fetch(CHATGPT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CHATGPT_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{role: "user", content: `${prompt} ${text}`}],
            max_tokens: 500
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

function displayDetailedAnalysis(analysis, posts) {
    const detailedAnalysis = document.getElementById('detailedAnalysis');
    const analysisContent = document.getElementById('analysisContent');
    const problemStatement = document.getElementById('problemStatement');

    // Split the analysis to extract problem statement and insights
    const parts = analysis.split('\n\n');
    const problemStmt = parts.shift(); // Assuming first part is the problem statement
    const insights = parts.join('\n\n'); // Remaining parts are insights

    problemStatement.innerHTML = `<p>${problemStmt}</p>`;
    analysisContent.innerHTML = `<ul class="insights">${formatAnalysisAsList(insights)}</ul>`;

    // Add quotes from posts
    const quotes = posts.map(post => `<p class="quote">"${post.data.selftext}" - <a href="https://www.reddit.com${post.data.permalink}" target="_blank">${post.data.title}</a></p>`).join('');
    analysisContent.innerHTML += `<h3>Quotes from Posts:</h3>${quotes}`;

    detailedAnalysis.classList.remove('hidden');
}

function formatAnalysisAsList(analysis) {
    return analysis.split('\n').map(insight => `<li>${insight}</li>`).join('');
}

async function showPostAnalysis(post) {
    const analysis = await getChatGPTAnalysis(post.title + ' ' + post.selftext, `Identify the main pain points people are facing in the following Reddit post: `);
    const analysisElement = document.getElementById(`analysis-${post.id}`);
    analysisElement.innerHTML += `<p>${analysis}</p>`;
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        searchReddit();
    }
}
