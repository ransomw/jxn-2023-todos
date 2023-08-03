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
    

class Mutation(graphene.ObjectType):
    login = Login.Field()

class Query(graphene.ObjectType):
    hello = graphene.String(first_name=graphene.String(default_value="stranger"))

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

        print("getting gql context.  keys:" + repr(context.keys()))

        curr_request = context['request']

        print("flask request headers keys:"+repr(list(curr_request.headers.keys())))

        auth_header = curr_request.headers.get('Authorization', '')

        token = None

        if auth_header:
            mo = re.search(r'Bearer (.*)', auth_header)
            token = mo.group(1)

        if token:
            token_payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            username = token_payload['username']
        else:
            username = None

        print("gql context type: "+repr(type(context)))

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
