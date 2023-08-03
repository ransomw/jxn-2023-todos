# py-ts-todos

### usage


##### install

`npm install`

`python3 -m venv .venv`

`. ./.venv/bin/activate`

`pip install -r requirements.txt`

##### build

`python -m app gql-schema`

`npm run build:gql`

##### run

`python -m app run-app`
`npm start`

##### todo

* [ ] cleanup deps (rm `apollo-angular`)
* [ ] rm `"main"` key in `package.json`
* [ ] one-command build instead of regenerating gql schema
* [ ] dedupe webpack and webpack.prod files if possible
* [ ] use `graphql-jwt` https://www.howtographql.com/graphql-python/4-authentication/ _after_ understanding how to roll our own token auth
* [ ] code formatters (black and w/e is used with ts) on pre-commit hooks
* [ ] use graphene middleware for auth (?)
