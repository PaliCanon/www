# infra

The showcase's own Cloudflare resources, in its own tofu state
(`gs://palicanon-app-tofu-state`, prefix `www`). Applied by the
orchestrator, never by an agent or by CI.

There is no dev environment and no Worker (task 015): the Worker `www-dev`
and its custom domain `dev.palicanon.app` are gone, and `palicanon.app` is
the nginx container of the lsh-tech stack. One resource is left.

| What | Owner | Where |
| --- | --- | --- |
| `palicanon.app` | not here: the nginx container of the lsh-tech stack, behind the lsh-tech tunnel (task 014) | `Lsh0x/lsh-tech`, `stacks/palicanon/prod` |
| The record `www.palicanon.app`: a proxied AAAA `100::`, no origin behind it | tofu, task 006 | `cloudflare.tf`, `cloudflare_record.www` |
| The redirect `www` → apex | a zone ruleset | `Lsh0x/palicanon` |

## Prod (tasks 006, 013, 014)

Prod is served by the nginx container of the lsh-tech stack, not by a
Worker: a `v*` tag builds the image (`deploy.yml`, job `image`), which is
deployed by digest in `Lsh0x/lsh-tech`, `stacks/palicanon/prod`, on
ssh.lsh.tech behind the lsh-tech tunnel. Nothing in `deploy.yml` checks
`https://palicanon.app`: after the stack's deploy, run
`scripts/deploy-check.sh https://palicanon.app index` by hand.

### The www placeholder

`www.palicanon.app` has no Worker. The record exists so that Cloudflare
answers for the host: a Redirect Rule only runs on a proxied record, and
`100::` (the IPv6 discard prefix) is where the proxy has nothing to reach.
The rule itself (`www` → `https://palicanon.app` + path, 301, query kept) is
a zone ruleset in `Lsh0x/palicanon` (not here), and answers
before any origin. Output `www_record`.

## Removing the dev domain (task 015), the orchestrator

`tofu plan` destroys one resource and changes nothing else:
`cloudflare_workers_domain.dev` (`dev.palicanon.app` → `www-dev`). The plan
reads the zone and the `www` record: both stay. Credentials from the
environment, the token from the keychain, never typed or printed:

```sh
gcloud auth application-default login
export CLOUDFLARE_API_TOKEN=$(security find-generic-password -a lsh -s cloudflare-api-token-palicanon -w)
cd infra
tofu init
tofu plan     # 0 to add, 0 to change, 1 to destroy: cloudflare_workers_domain.dev
tofu apply
```

By hand, outside tofu: the Worker script `www-dev` itself was wrangler's
(never in the state): delete it in the Cloudflare dashboard, Workers & Pages,
after the domain is destroyed. The GitHub secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` of the repository are read by nothing any more:
delete them. (`CLOUDFLARE_API_TOKEN` of the shell above is the keychain
token, for tofu: it stays.)

## Notes

- **Checks of this directory**: `tofu fmt -check -recursive infra`; `tofu
  validate` after `tofu init -backend=false` in a scratch copy;
  `test/infra.test.ts` (no Worker, no custom domain, one record, no secret).
