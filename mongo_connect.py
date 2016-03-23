from pymongo import MongoClient

def get_skynet():
    db_host = '10.0.11.134'
    db_port = 27017
    rs = 'SamTheEagle'
    database_name = 'skynet'
    db_user = 'SkynetReadWrite'
    db_password = 'zDyxbep7jxdmpcBc8pfjuLVY'
    db_auth_source = 'admin'
    client = get_db_con(db_host, db_port, rs, database_name, db_user, db_password, db_auth_source)
    return client[database_name]

def get_predictions():
    db_host = '10.0.11.134'
    db_port = 27017
    rs = 'SamTheEagle'
    database_name = 'predictions'
    db_user = 'Analytics'
    db_password = 'L3x1^gt0n'
    db_auth_source = 'admin'
    client = get_db_con(db_host, db_port, rs, database_name, db_user, db_password, db_auth_source)
    return client[database_name]

def get_db_con(host, port, rs, db_name, db_user, db_password, auth_source):
    client = MongoClient(host, port, replicaset = rs)
    valid_login = client[db_name].authenticate(db_user, db_password, source=auth_source)
    return client

def main():
    pass

if __name__ == "__main__":
    main()
