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


const ADD_TEXT_TODO_MUTATION_STR = /* GraphQL */ `
  mutation AddTodo($text: String!) {
    createTodo(text: $text) {
        todo {
          text
          id
        }
    }
  }
`;

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


const DELETE_TEXT_TODO_MUTATION_STR = /* GraphQL */ `
  mutation DeleteTodo($id: Int!) {
    deleteTodo(id: $id) {
        ok
    }
  }
`;

const UPDDATE_TEXT_TODO_MUTATION_STR = /* GraphQL */ `
  mutation UpdateTodo($todo: TodoInput!) {
    updateTodo(todoData: $todo) {
        todo {
            text
            id
        }
    }
  }
`;

const TEXT_TODOS_QUERY_STR = /* GraphQL */ `
query TextTodosQuery {
    todos {
        text
        id
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



// todo: disable button when input empty
const TextOnlyTodoInput: React.FC = () => {
  const [todo_text, set_todo_text] = useState('');


  // todo: use generated gql function rather than apollo client import?
  const add_todo_mutation : DocumentNode = gql(ADD_TEXT_TODO_MUTATION_STR) as DocumentNode;

  const [add_todo, { data, loading, error }] = useMutation(add_todo_mutation, {
      refetchQueries: [
        'TextTodosQuery'
      ],
    });
    


  if (loading) return (<span>'Submitting...'</span>);
  if (error) return (<span>`Submission error! ${error.message}`</span>);

  const on_input_change = (event: React.ChangeEvent<HTMLInputElement>) => {
      set_todo_text(event.target.value);
  };

  const on_button_click = (event: MouseEvent<HTMLButtonElement>) => {
      add_todo({ variables: { text: todo_text } });
      set_todo_text('');
  };

  return (<div>
      <input
          type="text"
          id="todo-text"
          name="todo-text"
          onChange={on_input_change}
          value={todo_text}
      />
      <button onClick={on_button_click}>Save</button>
  </div>);
};

type TextTodo = {
  text: String,
  id: number,
};

const TodoListItem: React.FC<{todo: TextTodo}> = ({todo}) => {
  const [is_editing, set_is_editing] = useState(false);
  const [update_text, set_update_text] = useState(todo.text as string);

  const delete_todo_mutation : DocumentNode = gql(DELETE_TEXT_TODO_MUTATION_STR) as DocumentNode;
  const update_todo_mutation : DocumentNode = gql(UPDDATE_TEXT_TODO_MUTATION_STR) as DocumentNode;

  const [delete_todo, 
      {data: delete_data, loading: delete_loading, error: delete_error}
  ] = useMutation(delete_todo_mutation, {
      refetchQueries: [
          'TextTodosQuery'
      ]
  });

  const [update_todo, 
      {data: update_data, loading: update_loading, error: update_error}
  ] = useMutation(update_todo_mutation, {
      refetchQueries: [
          'TextTodosQuery'
      ]
  });

  const handle_delete_click = (event : MouseEvent<HTMLButtonElement>) => {
      delete_todo({variables: {id: todo.id}});
  };

  const handle_edit_click = (event : MouseEvent<HTMLSpanElement>) => {
      set_is_editing(true);
  }

  const on_input_change = (event: React.ChangeEvent<HTMLInputElement>) => {
      set_update_text(event.target.value);
  };

  const on_button_click = (event : MouseEvent<HTMLButtonElement>) => {
      update_todo({variables: {todo: {text: update_text, id: todo.id}}})
      set_is_editing(false);
  };


  return (<li>
      {is_editing ? 
      <span>
      <input
          type="text"
          id="todo-text"
          name="todo-text"
          onChange={on_input_change}
          value={update_text}
      />
      <button onClick={on_button_click}>Save</button>
      </span> :       
      <span onClick={handle_edit_click}>{todo.text}</span>}
      <button onClick={handle_delete_click}>delete</button>
      </li>);
};

const TextOnlyTodoListItems: React.FC = () => {
  const text_todos_query : DocumentNode = gql(TEXT_TODOS_QUERY_STR) as DocumentNode;
  const {loading, data} = useQuery(text_todos_query);

  if (loading) {
      return (<span>loading...</span>)
  }

  const todo_list_items = data.todos.map(
      // todo: get type inference out of gql schema if possible?
      (todo: TextTodo) => (<TodoListItem key={todo.id} todo={todo}/>)
  );

  return (<ul>
      {todo_list_items}
  </ul>);
};


const TextOnlyTodoList: React.FC = () => {
  return (
      <div>
            <TextOnlyTodoInput/>
            <TextOnlyTodoListItems/>
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