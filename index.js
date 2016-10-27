#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var exec = require('child_process').exec
var s3sync = require('s3-sync')
var readdirp = require('readdirp')
var yaml = require('js-yaml')

var s3Options = {
  key: process.env.AWS_KEY,
  secret: process.env.AWS_SECRET,
  bucket: process.env.AWS_BUCKET,
  region: 'us-east-1'
}

if (!(s3Options.key && s3Options.secret)) {
  var config
  try {
    config = require('./keys.json')
  } catch (e) {
    console.warn(
      'You must provide the AWS keys as either env vars or in keys.json.'
    )
    process.exit(1)
  }
  s3Options.key = config.key
  s3Options.secret = config.secret
  s3Options.secret = config.keys
}

getGitBranch()
  .then(getPrefix)
  .then(updateHexoConfig)
  .then(generateSite)
  .then(deployToS3)
  .catch(function (err) {
    console.warn(err);
    // Exit with an error code so deploy fails.
    process.exit(1);
  })

function getGitBranch () {
  return new Promise(function (resolve, reject) {
    exec('git status', function (err, out) {
      if (err) return reject(err)
      var branch = out.toString().match(/^On branch (.+)/)[1]

      var match;
      if (branch === 'master') {
        resolve('')
      } else if (match = branch.match(/^version-(.*)/)) {
        resolve('v' + match[1]);
      } else if (match = branch.match(/^translation-(.*)/)){
        resolve(match[1]);
      } else {
        resolve('branch-' + branch);
      }
    })
  })
}

function getPrefix(branch) {
  var config = fs.readFileSync('_config.yml', 'utf-8');
  var root = yaml.load(config).root.replace(/\//g, '')
  var parts = []
  if (branch) {
    parts.push(branch)
  }
  if (root) {
    parts.push(root)
  }
  // either '', 'branch', 'root', or 'branch/root'
  return parts.join('/')
}

function updateHexoConfig (prefix) {
  if (!prefix) {
    return Promise.resolve(prefix)
  } else {
    console.log('Updating hexo config...')
    return new Promise(function (resolve, reject) {
      fs.readFile('_config.yml', 'utf-8', function (err, content) {
        if (err) return reject(err)
        content = content
          .replace('\nroot: .*\n', 'root: /' + prefix + '/')
        fs.writeFile('_config.yml', content, function (err) {
          if (err) return reject(err)
          console.log('done.')
          resolve(prefix)
        })
      })
    })
  }
}

function generateSite (prefix) {
  console.log('Generating static site...')
  return new Promise(function (resolve, reject) {
    exec('hexo generate', function (err) {
      if (err) return reject(err)
      console.log('done.')
      resolve(prefix)
    })
  })
}

function deployToS3 (prefix) {
  console.log('deploying to S3 at "' + prefix + '"...')
  s3Options.prefix = prefix ? prefix + '/' : ''
  var fileOptions = { root: 'public' }
  readdirp(fileOptions)
    .pipe(s3sync(s3Options).on('data', function(file) {
      console.log(file.path + ' -> ' + file.url)
    }).on('end', function() {
      console.log('All done!')
    }).on('fail', function(err) {
      console.warn(err)
    }))
}
