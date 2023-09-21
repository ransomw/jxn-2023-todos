import re

import werkzeug
import flask
from flask import jsonify
from flask import render_template
import graphene
from graphql_server.flask.graphqlview import GraphQLView
from graphql.utilities import print_schema
import click
import jwt

JWT_SECRET = 'super-secret'

class Login(graphene.Mutation):
    class Arguments:
        username = graphene.String()
        password = graphene.String()

    token = graphene.String()

    def mutate(root, id, username, password):
        token = jwt.encode({"username": username}, JWT_SECRET, algorithm="HS256")
        return Login(token=token)
    

_todos = []
_next_todo_id = 0

class Todo(graphene.ObjectType):
    text = graphene.String()
    id = graphene.Int()

class CreateTodo(graphene.Mutation):
    class Arguments:
        text = graphene.String()

    todo = graphene.Field(lambda: Todo)

    def mutate(root, info, text):
        global _next_todo_id
        todo = Todo(text=text, id=_next_todo_id)
        _next_todo_id += 1
        _todos.append(todo)
        return CreateTodo(todo=todo)
    

class DeleteTodo(graphene.Mutation):
    class Arguments:
        id = graphene.Int()

    ok = graphene.Boolean()

    def mutate(root, info, id):
        global _todos
        if id not in [todo.id for todo in _todos]:
            # todo: is this the GQL way to pass exceptions?  try out in graphiql
            raise Exception("no todo with id "+str(id))
        _todos = [todo for todo in _todos if todo.id != id]
        return DeleteTodo(ok=True)


class TodoInput(graphene.InputObjectType):
    text = graphene.String(required=True)
    id = graphene.Int(required=True)


class UpdateTodo(graphene.Mutation):
    class Arguments:
        todo_data = TodoInput(required=True)

    todo = graphene.Field(Todo)

    def mutate(root, id, todo_data=None):
        todo = Todo(text=todo_data.text, id=todo_data.id)
        gen = (idx for idx, curr_todo in enumerate(_todos) if curr_todo.id == todo_data.id)
        todo_idx = next(gen)
        _todos[todo_idx].text = todo_data.text
        return UpdateTodo(todo=todo)


class Mutation(graphene.ObjectType):
    login = Login.Field()
    create_todo = CreateTodo.Field()
    delete_todo = DeleteTodo.Field()
    update_todo = UpdateTodo.Field()


class Query(graphene.ObjectType):
    hello = graphene.String(first_name=graphene.String(default_value="stranger"))

    todos = graphene.List(Todo)

    def resolve_todos(root, info):
        return _todos

    def resolve_hello(root, info, first_name):
        if info.context.get('username', ''):
            return f"Hello {info.context.get('username')}"
        return f'Hello {first_name}!'


schema = graphene.Schema(
    query=Query, 
    mutation=Mutation,
    )

app = flask.Flask(__name__, template_folder='srv_templates', static_folder='srv_static')

@app.route("/")
def home():
    return render_template("home.html")


class MyGraphQLView(GraphQLView):
    def get_context(self):
        context = super().get_context()
        curr_request = context['request']
        auth_header = curr_request.headers.get('Authorization', '')
        token = None
        if auth_header:
            mo = re.search(r'Bearer (.*)', auth_header)
            token = mo.group(1)
        username = None
        if token:
            token_payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            username = token_payload['username']
        context['username'] = username
        return context


app.add_url_rule(
    "/graphql",
    view_func=MyGraphQLView.as_view(
        'graphql',
        schema=schema,
        graphiql=True,
    )
)


@click.group()
def cli():
    pass

@cli.command()
def gql_schema():
    my_schema_str = print_schema(schema.graphql_schema)
    with open("schema.graphql", "w") as fp:
        fp.write(my_schema_str)
        fp.close()

@cli.command()
def run_app():
    werkzeug.serving.run_simple(
        "0.0.0.0",
        5000,
        app,
        use_debugger=True,
        use_reloader=True,
    )
