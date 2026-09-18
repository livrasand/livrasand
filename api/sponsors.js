import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

if (!process.env.GITHUB_TOKEN) {
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}

export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ message: 'GITHUB_TOKEN is not configured' });
    return;
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'livrasand-website'
  };

  const sponsors = [];
  let cursor = null;
  try {
    while (true) {
      const query = `query {
        viewer {
          sponsorshipsAsMaintainer(first: 100, activeOnly: false${cursor ? `, after: "${cursor}"` : ''}) {
            nodes {
              isOneTimePayment
              sponsor {
                __typename
                login
                name
                avatarUrl
                url
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }`;

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query })
      });
      const body = await response.json();

      if (!response.ok || body.errors || !body.data) {
        const message = body.errors
          ? body.errors.map((e) => e.message).join(', ')
          : body.message || `GitHub API error: ${response.status} ${response.statusText}`;
        res.status(502).json({ message });
        return;
      }

      const result = body.data.viewer.sponsorshipsAsMaintainer;
      for (const node of result.nodes) {
        if (!node.sponsor) {
          continue;
        }
        sponsors.push({
          login: node.sponsor.login,
          avatar_url: node.sponsor.avatarUrl,
          html_url: node.sponsor.url,
          type: node.sponsor.__typename,
          one_time: Boolean(node.isOneTimePayment)
        });
      }

      if (!result.pageInfo.hasNextPage) {
        break;
      }
      cursor = result.pageInfo.endCursor;
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).json(sponsors);
  } catch (err) {
    res.status(502).json({ message: 'Failed to fetch sponsors' });
  }
}