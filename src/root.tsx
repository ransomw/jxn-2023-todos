import React, {MouseEvent, useState} from 'react';
import {setContext} from '@apollo/client/link/context';
import { 
    ApolloProvider,
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    useMutation,
    DocumentNode,
    useQuery,
} from '@apollo/client';
import { gql } from './__generated__/gql';

declare const BUILD_ENV : string | undefined;

const AUTH_TOKEN = 'super-secret-auth-token';

export let root_url = "";
if (BUILD_ENV == "dev") {
    root_url = "/api";
} else if (BUILD_ENV == "prod") {
    root_url = "";
} else {
    throw new Error("unknown build "+BUILD_ENV)
}

const LOGIN_MUTATION_STR = /* GraphQL */ `
  mutation loginMutation(
    $username: String!
    $password: String!
  ) {
    login(username: $username, password: $password) {
      token
    }
  }
`;

const HELLO_LOGIN_QUERY_STR = /* GraphQL */ `
  query helloLoginQuery {
    hello
  }
`;

const httpLink = createHttpLink({
    uri: root_url + '/graphql',
});
  
const authLink = setContext((_, {headers}) => {
    const token = localStorage.getItem(AUTH_TOKEN);
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : ''
      }
    };
});


export const client = new ApolloClient({
//    uri: root_url + '/graphql',
link: authLink.concat(httpLink),
cache: new InMemoryCache(),
});

const LoginTestWithButtonOnly: React.FC = () => {
  const login_mutation : DocumentNode = gql(LOGIN_MUTATION_STR) as DocumentNode;
  const test_query : DocumentNode = gql(HELLO_LOGIN_QUERY_STR) as DocumentNode;
  const [login] = useMutation(login_mutation, {
    onCompleted: ({ login }) => {

      console.log("got login token "+login.token);
      localStorage.setItem(AUTH_TOKEN, login.token);
      
    },
    refetchQueries: ['helloLoginQuery']
  });

  const { loading: loading_test, data: data_test } = useQuery(test_query);

  const on_hello_login_click = (event: MouseEvent<HTMLButtonElement>) => {
    console.log("clicked login button");
    login(
    { variables: {
      username: "bob",
      password: "pass",
    }});
  };

  const on_test_populate_context_click = (event: MouseEvent<HTMLButtonElement>) => {
    client.query({
      query: test_query,
    }).then((result) => {
      console.log(result);
    })
  }

  return (
  <div><div>
    <button onClick={on_hello_login_click}>hello login</button>
    </div>
    <div>
      {loading_test ? (<p>loading...</p>) : 
      ( <p>{data_test && data_test.hello}</p> )
      }
    </div>
    <button onClick={on_test_populate_context_click}>logged in?</button>
    </div>);
};


const RootPlaceholder: React.FC = () => {

    return (<ApolloProvider client={client}> 
        <React.StrictMode>
        <div>
        <h1>hello world</h1>
        <LoginTestWithButtonOnly/>
        </div>
        </React.StrictMode>
        </ApolloProvider>);
}

export default RootPlaceholder;