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
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  Outlet,
  useNavigate,
  redirect,
} from "react-router-dom";
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


const client = new ApolloClient({
//    uri: root_url + '/graphql',
link: authLink.concat(httpLink),
cache: new InMemoryCache(),
});

const LoginTestWithButtonOnly: React.FC = () => {
  const login_mutation : DocumentNode = gql(LOGIN_MUTATION_STR) as DocumentNode;
  const test_query : DocumentNode = gql(HELLO_LOGIN_QUERY_STR) as DocumentNode;
  const { loading: loading_test, data: data_test, refetch: refetch_test } = useQuery(test_query);
  const [login] = useMutation(login_mutation, {
    onCompleted: ({ login }) => {

      console.log("got login token "+login.token);
      localStorage.setItem(AUTH_TOKEN, login.token);
      refetch_test();
    },
    // refetchQueries: ['helloLoginQuery']
  });



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


const UserPassLogin: React.FC = () => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    password: '',
    username: ''
  });
  const login_mutation : DocumentNode = gql(LOGIN_MUTATION_STR) as DocumentNode;
  const [login] = useMutation(login_mutation, {
    onCompleted: ({ login }) => {
      console.log("got login token "+login.token);
      localStorage.setItem(AUTH_TOKEN, login.token);
      navigate(`/`);
    },
  });

  const on_login_click_handler = (event : MouseEvent<HTMLButtonElement>) => {
    console.log("clicked login button");
    login(
    { variables: {
      username: formState.username,
      password: formState.password,
    }});
  }

  return (
  <div>
    <div>
      <label>username</label>
      <input value={formState.username}
        onChange={(ev) => setFormState({...formState, username: ev.target.value})}
        placeholder='Enter username'
        type='text'/>
    </div>
    <div>
      <label>password</label>
      <input value={formState.password}
        onChange={(ev) => setFormState({...formState, password: ev.target.value})}
        placeholder='Enter password'
        type='password'/>
    </div>
    <button onClick={on_login_click_handler}>Login</button>
  </div>
  );
};


const TextOnlyTodoList: React.FC = () => {
  return (
      <div>
          <h3>Todo list unimplemented</h3>
      </div>
  )
}


const RouterRoot: React.FC = () => {
  const authToken = localStorage.getItem(AUTH_TOKEN);
  const navigate = useNavigate();
  const on_click_logout = (event: MouseEvent<HTMLSpanElement>) => {
    localStorage.removeItem(AUTH_TOKEN);
    navigate(`/`);
  }
  return (
      <div>
<nav>
<ul>
  <li>
      <Link to={`/`}>home</Link>
  </li>
  <li>
      <Link to={`todo-list`}>Todo List</Link>
  </li>
  {!authToken ? ( 
  <li>
      <Link to={`login`}>Login</Link>
  </li>
  ) : (
    <li>
      <span onClick={on_click_logout}>Logout</span>
    </li>
  )}
</ul>
</nav>
      <div>
          <Outlet/>
      </div>
      </div>
  )
} 

const router = createBrowserRouter([
  {
      path: "/",
      element: <RouterRoot/>,
      children: [
          {
              index: true,
              element: <div>hello world!</div>
          },
          {
            path: "todo-list",
            element: <TextOnlyTodoList/>,
            loader:async () => {
              const authToken = localStorage.getItem(AUTH_TOKEN);
              if(!authToken) {
                return redirect(`/login`);
              }
              return null;
            }
          },
          {
            path: "login",
            element: <UserPassLogin/>,
          },
      ],
  },
]);

const RootPlaceholder: React.FC = () => {

    return (<ApolloProvider client={client}> 
        <React.StrictMode>
        <div>
        <RouterProvider router={router} />
        </div>
        </React.StrictMode>
        </ApolloProvider>);
}

export default RootPlaceholder;