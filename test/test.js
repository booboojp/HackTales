const commits = [
    {
        // Basic Info
        id: 1,
        title: 'Update dependencies',
        subtitle: 'main',
        
        // Commit Message Details
        messageBody: 'Updated all dependencies to their latest versions\n- React 18.2.0\n- Next.js 13.5.4\n- TypeScript 5.2.2',
        coAuthors: ['Jane Doe <jane@example.com>'],
        
        // Change Statistics
        amountAdded: 234,
        amountRemoved: 121,
        filesChanged: 12,
        
        // File Changes
        changedFiles: [
            {
                path: 'package.json',
                status: 'modified',
                additions: 15,
                deletions: 15,
                mode: '100644',
                isBinary: false,
                patch: '@@ -1,4 +1,4 @@\n...'
            },
            // ... other files
        ],
        
        // Commit References
        commitId: 'a7d3f92c4e2d631b023f4c8bc38205892e3b534f',
        commitIdShort: 'a7d3f92',
        parentCommits: ['b4d2e81f...', 'c5e3f92a...'], // Multiple parents for merge commits
        treeHash: 'd8e3f92c4e2d631b023f4c8bc38205892e3b534f',
        
        // Time Information
        date: 'February 11',
        time: '12:01 am',
        timezone: '-0800',
        authorDate: '2025-02-11T00:01:00-08:00',
        committerDate: '2025-02-11T00:01:00-08:00',
        relativeTime: '2 days ago',
        
        // Author/Committer Information
        author: {
            name: 'Brent Rambo',
            email: 'brent@example.com',
            avatarUrl: 'https://github.com/brentrambo.png'
        },
        committer: {
            name: 'GitHub',
            email: 'noreply@github.com',
            avatarUrl: 'https://github.com/github.png'
        },
        
        // Branch/Reference Information
        branch: 'main',
        tags: ['v1.2.0', 'release/2025-02'],
        containingBranches: ['main', 'develop', 'feature/nav-fix'],
        isHead: true,
        remoteBranch: 'origin/main',
        
        // Verification Information
        gpgSignature: {
            signed: true,
            verified: true,
            keyId: 'GPG key ID',
            signer: 'Brent Rambo <brent@example.com>'
        },
        
        // CI/Status Information
        status: {
            state: 'success',
            description: 'All checks have passed',
            contexts: [
                {
                    context: 'CI/CD',
                    state: 'success',
                    description: 'Build succeeded',
                    targetUrl: 'https://ci.example.com/build/123'
                }
            ]
        },
        pullRequest: {
            number: 42,
            title: 'Update Dependencies',
            url: 'https://github.com/org/repo/pull/42'
        },
        
        // Repository Context
        repository: {
            name: 'repo',
            owner: 'org',
            branch: 'main',
            visibility: 'public'
        },
        hackTalesData: {
            svg: "github",
        },
    },

];
const defaultSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path d="M3 3h18v18H3z" stroke-width="2"/>
    <path d="M9 12h6M12 9v6" stroke-width="2" stroke-linecap="round"/>
</svg>
`;


const sortingOptions = [
    {
        id: 'recent',
        displayText: 'Recent Commits',
        sortFunction: () => {
            console.log('Sorting by recent commits');
        }
    },
    {
        id: 'additions',
        displayText: 'Most Additions',
        sortFunction: () => {
           console.log('Sorting by most additions');
        }
    },
    {
        id: 'deletions',
        displayText: 'Most Deletions',
        sortFunction: () => {
            console.log('Sorting by most deletions');
        }
    },
    {
        id: 'files',
        displayText: 'Most Files Changed',
        sortFunction: () => {
            console.log('Sorting by most files changed');
        }
    }
];

let currentSortingIndex = 0;

document.querySelector('.sort-text').addEventListener('click', () => {
    const sortText = document.querySelector('.sort-text');
    sortText.classList.add('switching');
    
    setTimeout(() => {
        currentSortingIndex = (currentSortingIndex + 1) % sortingOptions.length;
        const newOption = sortingOptions[currentSortingIndex];
        sortText.textContent = newOption.displayText;
        newOption.sortFunction();
        
        setTimeout(() => {
            sortText.classList.remove('switching');
        }, 100);
    }, 200);
});






















async function getSVGIcon(commit) {
    try {
        const SVGType = commit.hackTalesData?.svg;
        if (!SVGType) return defaultSvg;

        const response = await fetch('/test/configurations/svglist.json');
        response.ok || (() => { throw new Error('Failed to load SVG list'); })();
        
        const svgList = await response.json();
        const svgItem = svgList.find(item => item.name === SVGType);
        if (!svgItem) return defaultSvg;
        const svgPath = svgItem.path.startsWith('http') ? (svgItem.path) : (`/test/${svgItem.path.replace(/^\.\//, '')}`);
        const svgResponse = await fetch(svgPath);
        if (!svgResponse.ok) throw new Error(`Failed to load SVG: ${svgPath}`);
        const svgContent = await svgResponse.text();
        return svgContent;
    } catch (error) {
        console.error('Error loading SVG:', error);
        return defaultSvg;
    }
}


async function createCommitHTML(commit) {
    const svgContent = await getSVGIcon(commit);
    return `
        <div class="transaction" style="view-transition-name: transaction-${commit.id}">
            <div class="icon-container">
                <div class="icon" style="view-transition-name: icon-${commit.id}">
                    ${svgContent}
                </div>
                <button class="close-btn" style="view-transition-name: close-btn-${commit.id}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                        <path d="M12 4L4 12M4 4l8 8" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>

            <div class="details">
                <div class="title-container" style="view-transition-name: title-container-${commit.id}">
                    <div class="title">${commit.title}</div>
                    <div class="subtitle">${commit.subtitle}</div>
                </div>
                <div class="amount" style="view-transition-name: amount-${commit.id}">
                    <span class="amount-added">+${commit.amountAdded}</span>
                    <span class="amount-removed">-${commit.amountRemoved}</span>
                </div>
            </div>

            <div class="commit-full-details">
                <div class="details-section">
                    <h3>Commit Message</h3>
                    <pre class="message-body">${commit.messageBody}</pre>
                    ${commit.coAuthors.length ? `
                        <div class="co-authors">
                            <h4>Co-authors:</h4>
                            ${commit.coAuthors.map(author => `<div>${author}</div>`).join('')}
                        </div>
                    ` : ''}
                </div>

                <div class="details-section">
                    <h3>Changes</h3>
                    <div class="stats">
                        <div>Files Changed: ${commit.filesChanged}</div>
                        <div class="changes">
                            <span class="amount-added">+${commit.amountAdded}</span>
                            <span class="amount-removed">-${commit.amountRemoved}</span>
                        </div>
                    </div>
                    <div class="changed-files">
                        ${commit.changedFiles.map(file => `
                            <div class="file-change">
                                <div class="file-path">${file.path}</div>
                                <div class="file-stats">
                                    <span class="amount-added">+${file.additions}</span>
                                    <span class="amount-removed">-${file.deletions}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="details-section">   
                    <h3>Commit Info</h3>
                    <div class="commit-info">
                        <div>Hash: ${commit.commitId}</div>
                        <div>Tree: ${commit.treeHash}</div>
                        <div>Parent(s): ${commit.parentCommits.join(', ')}</div>
                        <div>Committed: ${commit.committerDate} (${commit.timezone})</div>
                        <div>Authored: ${commit.authorDate} (${commit.timezone})</div>
                        <div>Relative: ${commit.relativeTime}</div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Author & Committer</h3>
                    <div class="author-info">
                        <img src="${commit.author.avatarUrl}" alt="${commit.author.name}" class="avatar">
                        <div>
                            <div class="name">${commit.author.name}</div>
                            <div class="email">${commit.author.email}</div>
                        </div>
                    </div>
                    ${commit.author.email !== commit.committer.email ? `
                        <div class="committer-info">
                            <img src="${commit.committer.avatarUrl}" alt="${commit.committer.name}" class="avatar">
                            <div>
                                <div class="name">${commit.committer.name}</div>
                                <div class="email">${commit.committer.email}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="details-section">
                    <h3>Branch & Tags</h3>
                    <div class="branch-info">
                        <div>Branch: ${commit.branch}</div>
                        <div>Remote: ${commit.remoteBranch}</div>
                        ${commit.tags.length ? `
                            <div class="tags">
                                Tags: ${commit.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
                            </div>
                        ` : ''}
                        <div>Containing Branches: ${commit.containingBranches.join(', ')}</div>
                        ${commit.isHead ? '<div class="head-label">HEAD</div>' : ''}
                    </div>
                </div>

                ${commit.gpgSignature.signed ? `
                    <div class="details-section">
                        <h3>GPG Signature</h3>
                        <div class="gpg-info">
                            <div class="signature-status ${commit.gpgSignature.verified ? 'verified' : 'unverified'}">
                                ${commit.gpgSignature.verified ? '✓ Verified' : '⚠ Unverified'}
                            </div>
                            <div>Key ID: ${commit.gpgSignature.keyId}</div>
                            <div>Signer: ${commit.gpgSignature.signer}</div>
                        </div>
                    </div>
                ` : ''}

                ${commit.status ? `
                    <div class="details-section">
                        <h3>Status Checks</h3>
                        <div class="status-info">
                            <div class="status-overall ${commit.status.state}">
                                ${commit.status.description}
                            </div>
                            ${commit.status.contexts.map(context => `
                                <div class="status-check ${context.state}">
                                    <div class="context">${context.context}</div>
                                    <div class="description">${context.description}</div>
                                    ${context.targetUrl ? `
                                        <a href="${context.targetUrl}" target="_blank">Details →</a>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${commit.pullRequest ? `
                    <div class="details-section">
                        <h3>Pull Request</h3>
                        <div class="pr-info">
                            <a href="${commit.pullRequest.url}" target="_blank">
                                #${commit.pullRequest.number} - ${commit.pullRequest.title}
                            </a>
                        </div>
                    </div>
                ` : ''}

                <div class="details-section">
                    <h3>Repository</h3>
                    <div class="repo-info">
                        <div>${commit.repository.owner}/${commit.repository.name}</div>
                        <div>${commit.repository.visibility}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}


async function renderCommits() {
    const commitList = document.querySelector('.transaction-list');
    const commitPromises = commits.map(createCommitHTML);
    const commitHTMLs = await Promise.all(commitPromises);
    commitList.innerHTML = commitHTMLs.join('');
}


renderCommits();
const container = document.querySelector('.container');
container.addEventListener('click', (e) => {
    const transaction = e.target.closest('.transaction');
    const closeBtn = e.target.closest('.close-btn');

    if (closeBtn) {
        const expandedTransaction = document.querySelector('.transaction.expanded');
        const otherTransactions = [...document.querySelectorAll('.transaction')]
            .filter(t => t !== expandedTransaction);
        otherTransactions.forEach(t => t.classList.remove('not-expanded'));
        
        if(expandedTransaction) {
            document.startViewTransition({
                update: () => {
                    expandedTransaction.classList.remove('expanded');
                },
                types: ['collapse']
            });
        }
        return;
    }
    else if(transaction) {
        if(!transaction.classList.contains('expanded')) {
            const otherTransactions = [...document.querySelectorAll('.transaction')]
                .filter(t => t !== transaction);
            otherTransactions.forEach(t => t.classList.add('not-expanded'));
            
            document.startViewTransition({
                update: () => {
                    transaction.classList.add('expanded');
                },
                types: ['expand']
            });
        }
    }
});

// We are using async and await babyyy!
document.addEventListener('DOMContentLoaded', () => {
    renderCommits().catch(error => {
        console.error('Failed to render commits:', error);
    });
});