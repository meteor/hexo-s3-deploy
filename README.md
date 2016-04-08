## Hexo S3 deploy script

As used by the Meteor guide.

### Install

```
npm install --save-dev hexo-s3-deploy
```

### Add a command

(in `package.json`):

```
"scripts": {
  "deploy": "hexo-s3-deploy"
}
```

### Run command

Set the env vars

```
AWS_KEY
AWS_SECRET
AWS_BUCKET
```

or create a file `keys.json` with `key`, `secret`, and `bucket`

Then:

`npm run deploy`
