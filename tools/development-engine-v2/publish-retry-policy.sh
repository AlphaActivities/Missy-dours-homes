#!/usr/bin/env bash
set -euo pipefail

# Only the Actions publication step supplies the GitHub token.
[[ "$GITHUB_REPOSITORY" == "AlphaActivities/Missy-dours-homes" ]]
[[ "$GITHUB_REF" == "refs/heads/dev/development-engine-v2" ]]
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$GITHUB_RUN_ID" =~ ^[0-9]+$ ]]
[[ "$CANDIDATE_HASH" =~ ^[a-f0-9]{64}$ ]]
[[ "$REQUEST_HASH" =~ ^[a-f0-9]{64}$ ]]

target=tools/development-engine-v2/development-retry-policy.mjs
request=tools/development-engine-v2/requests/retry-policy.json
report=tools/development-engine-v2/reports/${REQUEST_HASH}.json
ref=refs/heads/dev/development-engine-v2-code-results
url=https://github.com/AlphaActivities/Missy-dours-homes.git
candidate=$RUNNER_TEMP/v2-retry-policy.mjs

[[ "$(sha256sum "$request" | cut -d' ' -f1)" == "$REQUEST_HASH" ]]
[[ "$(sha256sum "$candidate" | cut -d' ' -f1)" == "$CANDIDATE_HASH" ]]
# Keep authentication in memory and out of command arguments and git config files.
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=http.https://github.com/.extraheader
export GIT_CONFIG_VALUE_0="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 -w0)"
unset GH_TOKEN

for attempt in 1 2 3; do
  head_line=$(git ls-remote "$url" "$ref") || continue
  if [[ -n "$head_line" ]]; then
    git fetch --no-tags "$url" "$ref" || continue
    head=$(git rev-parse FETCH_HEAD)
    if git cat-file -e "$head:$report" 2>/dev/null; then
      git show "$head:$report" | jq -e --arg request "$REQUEST_HASH" --arg hash "$CANDIDATE_HASH" \
        '.request == $request and .candidate == $hash and .status == "verified"' >/dev/null
      git show "$head:$target" | sha256sum | cut -d' ' -f1 | grep -Fx "$CANDIDATE_HASH"
      printf 'Recovered previously verified result at %s\n' "$head"
      exit 0
    fi
  else
    head=$GITHUB_SHA
  fi

  base=$(jq -er .base "$request")
  [[ "$(git show "$head:$target" | sha256sum | cut -d' ' -f1)" == "$base" ]] || {
    echo 'Result branch document changed, update the request against the latest result.'
    exit 1
  }

  export GIT_INDEX_FILE="$RUNNER_TEMP/v2-result-index"
  git read-tree "$head"
  candidate_blob=$(git hash-object -w "$candidate")
  report_blob=$(jq -nc --arg request "$REQUEST_HASH" --arg candidate "$CANDIDATE_HASH" \
    --arg source "$GITHUB_SHA" --arg run "$GITHUB_RUN_ID" \
    '{request:$request,candidate:$candidate,source:$source,run:$run,status:"verified"}' | git hash-object -w --stdin)
  git update-index --add --cacheinfo "100644,$candidate_blob,$target" --cacheinfo "100644,$report_blob,$report"
  tree=$(git write-tree)
  commit=$(git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
    commit-tree "$tree" -p "$head" -m 'Publish verified V2 development retry policy [skip netlify]')
  if git push "$url" "$commit:$ref"; then
    git fetch --no-tags "$url" "$ref" || continue
    actual=$(git rev-parse FETCH_HEAD)
    [[ "$actual" == "$commit" ]] || continue
    git show "$actual:$target" | sha256sum | cut -d' ' -f1 | grep -Fx "$CANDIDATE_HASH"
    printf 'Verified result commit %s\n' "$commit"
    exit 0
  fi
done
echo 'Publication could not be confirmed after 3 attempts.'
exit 1
