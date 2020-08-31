import base64
import re
from moz_sql_parser import parse
import json
import xml.dom.minidom
import requests
from bs4 import BeautifulSoup

#Input Parameters
#input sql text
input_sql = '''select person_number from per_all_people_f where person_number = \'007\''''
#Instance URL - HTTPS
instanceURL = 'https://ekjy-test.fa.em2.oraclecloud.com'
#UserName
fusionUserName = 'eyadmin'
#Password
fusionPassword = 'Welcome@123'
#Folder path
folderPath = '/Custom/Human Capital Management/FusionSQLtoolTest1'

def createDataModel(folderPath, instanceURL, fusionUserName, fusionPassword):

	url = instanceURL + "/xmlpserver/services/v2/CatalogService"
	if objectExists(instanceURL, folderPath + "/FusionSQLToolDM.xdm", fusionUserName, fusionPassword) == 'false':
		print('DM does not exist. Creating DM.....')
		payload = "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:v2=\"http://xmlns.oracle.com/oxp/service/v2\">\r\n   <soapenv:Header/>\r\n   <soapenv:Body>\r\n      <v2:createObject>\r\n         <v2:folderAbsolutePathURL>" + folderPath + "</v2:folderAbsolutePathURL>\r\n         <v2:objectName>FusionSQLToolDM</v2:objectName>\r\n         <v2:objectType>xdm</v2:objectType>\r\n         <v2:objectDescription>testing 1</v2:objectDescription>\r\n         <v2:objectData>" + "PD94bWwgdmVyc2lvbiA9ICcxLjAnIGVuY29kaW5nID0gJ3V0Zi04Jz8+CjxkYXRhTW9kZWwgeG1sbnM9Imh0dHA6Ly94bWxucy5vcmFjbGUuY29tL294cC94bWxwIiB2ZXJzaW9uPSIyLjAiIHhtbG5zOnhkbT0iaHR0cDovL3htbG5zLm9yYWNsZS5jb20vb3hwL3htbHAiIHhtbG5zOnhzZD0iaHR0cDovL3d3d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hIiBkZWZhdWx0RGF0YVNvdXJjZVJlZj0iQXVkaXRWaWV3REIiPgogICA8ZGVzY3JpcHRpb24+CiAgICAgIDwhW0NEQVRBW3VuZGVmaW5lZF1dPgogICA8L2Rlc2NyaXB0aW9uPgogICA8ZGF0YVByb3BlcnRpZXM+CiAgICAgIDxwcm9wZXJ0eSBuYW1lPSJpbmNsdWRlX3BhcmFtZXRlcnMiIHZhbHVlPSJmYWxzZSIvPgogICAgICA8cHJvcGVydHkgbmFtZT0iaW5jbHVkZV9udWxsX0VsZW1lbnQiIHZhbHVlPSJ0cnVlIi8+CiAgICAgIDxwcm9wZXJ0eSBuYW1lPSJpbmNsdWRlX3Jvd3NldHRhZyIgdmFsdWU9ImZhbHNlIi8+CiAgICAgIDxwcm9wZXJ0eSBuYW1lPSJleGNsdWRlX3RhZ3NfZm9yX2xvYiIgdmFsdWU9ImZhbHNlIi8+CiAgICAgIDxwcm9wZXJ0eSBuYW1lPSJ4bWxfdGFnX2Nhc2UiIHZhbHVlPSJ1cHBlciIvPgogICAgICA8cHJvcGVydHkgbmFtZT0iZ2VuZXJhdGVfb3V0cHV0X2Zvcm1hdCIgdmFsdWU9InhtbCIvPgogICAgICA8cHJvcGVydHkgbmFtZT0ic3FsX21vbml0b3JfcmVwb3J0X2dlbmVyYXRlZCIgdmFsdWU9ImZhbHNlIi8+CiAgICAgIDxwcm9wZXJ0eSBuYW1lPSJvcHRpbWl6ZV9xdWVyeV9leGVjdXRpb25zIiB2YWx1ZT0iZmFsc2UiLz4KICAgPC9kYXRhUHJvcGVydGllcz4KICAgPGRhdGFTZXRzPgogICAgICA8ZGF0YVNldCBuYW1lPSJGU1QyIiB0eXBlPSJzaW1wbGUiPgogICAgICAgICA8c3FsIGRhdGFTb3VyY2VSZWY9IkFwcGxpY2F0aW9uREJfSENNIiBuc1F1ZXJ5PSJ0cnVlIiBzcD0idHJ1ZSIgeG1sUm93VGFnTmFtZT0iIiBiaW5kTXVsdGlWYWx1ZUFzQ29tbWFTZXBTdHI9ImZhbHNlIj4KICAgICAgICAgICAgPCFbQ0RBVEFbREVDTEFSRQogICAgdHlwZSByZWZjdXJzb3IgaXMgUkVGIENVUlNPUjsKICAgIHhkb19jdXJzb3IgcmVmY3Vyc29yOwogICAgICAgIHF1ZXJ5U3RyIHZhcmNoYXIyKDMyNzY3KTsKICAgIEJFR0lOCiAgICBxdWVyeVN0ciA6PSA6cXVlcnk7CiAgICBPUEVOIDp4ZG9fY3Vyc29yIEZPUiBxdWVyeVN0cjsKRU5EO11dPgogICAgICAgICA8L3NxbD4KICAgICAgPC9kYXRhU2V0PgogICA8L2RhdGFTZXRzPgogICA8b3V0cHV0IHJvb3ROYW1lPSJEQVRBX0RTIiB1bmlxdWVSb3dOYW1lPSJmYWxzZSI+CiAgICAgIDxub2RlTGlzdCBuYW1lPSJGU1QyIi8+CiAgIDwvb3V0cHV0PgogICA8ZXZlbnRUcmlnZ2Vycy8+CiAgIDxsZXhpY2Fscy8+CiAgIDxwYXJhbWV0ZXJzPgogICAgICA8cGFyYW1ldGVyIG5hbWU9Inhkb19jdXJzb3IiIGRhdGFUeXBlPSJ4c2Q6c3RyaW5nIiByb3dQbGFjZW1lbnQ9IjEiPgogICAgICAgICA8aW5wdXQvPgogICAgICA8L3BhcmFtZXRlcj4KICAgICAgPHBhcmFtZXRlciBuYW1lPSJxdWVyeSIgZGVmYXVsdFZhbHVlPSJzZWxlY3QgKiBmcm9tIGR1YWwiIGRhdGFUeXBlPSJ4c2Q6c3RyaW5nIiByb3dQbGFjZW1lbnQ9IjEiPgogICAgICAgICA8aW5wdXQgbGFiZWw9IlF1ZXJ5Ii8+CiAgICAgIDwvcGFyYW1ldGVyPgogICA8L3BhcmFtZXRlcnM+CiAgIDx2YWx1ZVNldHMvPgogICA8YnVyc3RpbmcvPgogICA8dmFsaWRhdGlvbnM+CiAgICAgIDx2YWxpZGF0aW9uPk48L3ZhbGlkYXRpb24+CiAgIDwvdmFsaWRhdGlvbnM+CiAgIDxkaXNwbGF5PgogICAgICA8bGF5b3V0cz4KICAgICAgICAgPGxheW91dCBuYW1lPSJGU1QyIiBsZWZ0PSIyODBweCIgdG9wPSIzNDNweCIvPgogICAgICAgICA8bGF5b3V0IG5hbWU9IkRBVEFfRFMiIGxlZnQ9IjBweCIgdG9wPSIzNHB4Ii8+CiAgICAgIDwvbGF5b3V0cz4KICAgICAgPGdyb3VwTGlua3MvPgogICA8L2Rpc3BsYXk+CjwvZGF0YU1vZGVsPgo=" + "</v2:objectData>\r\n         <v2:userID>" + fusionUserName + "</v2:userID>\r\n         <v2:password>" + fusionPassword + "</v2:password>\r\n      </v2:createObject>\r\n   </soapenv:Body>\r\n</soapenv:Envelope>"
		headers = {
  		'Content-Type': 'text/xml;charset=UTF-8',
  		'Host': instanceURL.replace('https://',''),
  		'SOAPAction': '""'
		}
		response = requests.request("POST", url, headers=headers, data = payload)
		#print(response.text.encode('utf8'))
	else:
		print('DM already exists.')

def createReport(instanceURL, folderPath, fusionUserName, fusionPassword):
	url = instanceURL + "/xmlpserver/services/v2/ReportService"
	dmPath = folderPath + "/FusionSQLToolDM.xdm"
	if objectExists(instanceURL, folderPath + '/FSTreport.xdo', fusionUserName, fusionPassword) == 'false':
		print('Report does not exist. Creating report.....')
		payload = "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:v2=\"http://xmlns.oracle.com/oxp/service/v2\">\r\n   <soapenv:Header/>\r\n   <soapenv:Body>\r\n      <v2:createReport>\r\n         <v2:reportName>FSTreport</v2:reportName>\r\n         <v2:folderAbsolutePathURL>" + folderPath + "</v2:folderAbsolutePathURL>\r\n         <v2:dataModelURL>" + dmPath + "</v2:dataModelURL>\r\n         <v2:templateFileName></v2:templateFileName>\r\n         <v2:templateData></v2:templateData>\r\n         <v2:XLIFFFileName></v2:XLIFFFileName>\r\n         <v2:XLIFFData></v2:XLIFFData>\r\n         <v2:updateFlag>true</v2:updateFlag>\r\n         <v2:userID>" + fusionUserName + "</v2:userID>\r\n         <v2:password>" + fusionPassword + "</v2:password>\r\n      </v2:createReport>\r\n   </soapenv:Body>\r\n</soapenv:Envelope>"
		headers = {
  		'Content-Type': 'text/xml;charset=UTF-8',
  		'Host': instanceURL.replace('https://',''),
  		'SOAPAction': '""'
		}
		response = requests.request("POST", url, headers=headers, data = payload)
		#print(response.text.encode('utf8'))
	else:
		print('Report already exists.')

def objectExists(instanceURL, objectPath, fusionUserName, fusionPassword):
	url = instanceURL + "/xmlpserver/services/v2/CatalogService"
	payload = "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:v2=\"http://xmlns.oracle.com/oxp/service/v2\">\r\n   <soapenv:Header/>\r\n   <soapenv:Body>\r\n      <v2:objectExist>\r\n         <v2:reportObjectAbsolutePath>" + objectPath + "</v2:reportObjectAbsolutePath>\r\n         <v2:userID>" + fusionUserName + "</v2:userID>\r\n         <v2:password>" + fusionPassword + "</v2:password>\r\n      </v2:objectExist>\r\n   </soapenv:Body>\r\n</soapenv:Envelope>"
	headers = {
  	'Content-Type': 'text/xml;charset=UTF-8',
  	'Host': instanceURL.replace('https://',''),
  	'SOAPAction': '""'
	}
	response = requests.request("POST", url, headers=headers, data = payload)
	soup = BeautifulSoup(response.text.encode('utf8'), 'xml')
	return soup.find('objectExistReturn').string

def runReport(instanceURL, input_sql, folderPath, reportPath, fusionUserName, fusionPassword):
	input_sql = input_sql.replace('&','&amp;').replace('=','&#61;').replace('<','&lt;').replace('>','&gt;')
	url = instanceURL + "/xmlpserver/services/v2/ReportService"
	payload = "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:v2=\"http://xmlns.oracle.com/oxp/service/v2\">\r\n    <soapenv:Header/>\r\n    <soapenv:Body>\r\n        <v2:runReport>\r\n            <v2:reportRequest>\r\n                <v2:attributeFormat>xml</v2:attributeFormat>\r\n                <v2:byPassCache>True</v2:byPassCache>\r\n                <v2:flattenXML>True</v2:flattenXML>\r\n                <v2:parameterNameValues>\r\n                    <v2:listOfParamNameValues>\r\n                        <v2:item>\r\n                            <v2:name>query</v2:name>\r\n                            <v2:values>\r\n                                <v2:item>" + input_sql + "</v2:item>\r\n                            </v2:values>\r\n                        </v2:item>\r\n                        <v2:item>\r\n                            <v2:name>xdo_cursor</v2:name>\r\n                            <v2:values>\r\n                                <v2:item></v2:item>\r\n                            </v2:values>\r\n                        </v2:item>\r\n                    </v2:listOfParamNameValues>\r\n                </v2:parameterNameValues>\r\n                <v2:reportAbsolutePath>" + reportPath + "</v2:reportAbsolutePath>\r\n                <v2:sizeOfDataChunkDownload>-1</v2:sizeOfDataChunkDownload>\r\n            </v2:reportRequest>\r\n            <v2:userID>" + fusionUserName + "</v2:userID>\r\n            <v2:password>" + fusionPassword + "</v2:password>\r\n        </v2:runReport>\r\n    </soapenv:Body>\r\n</soapenv:Envelope>"
	headers = {
	'Content-Type': 'text/xml;charset=UTF-8',
	'Host': instanceURL.replace('https://',''),
	'SOAPAction': '""'
	}
	try:
		response = requests.request("POST", url, headers=headers, data = payload)
		soup = BeautifulSoup(response.text.encode('utf8'), 'xml')
	except:
		createDataModel(folderPath, instanceURL, fusionUserName, fusionPassword)
		createReport(instanceURL, folderPath, fusionUserName, fusionPassword)
	try:
		reportBytes = soup.find('reportBytes').string
		return base64.b64decode(reportBytes).decode('UTF-8')
	except:
		return str(soup.find('faultstring').text)


def runSQL(instanceURL, input_sql, fusionUserName, fusionPassword):
	try:
		#createDataModel(folderPath, instanceURL, fusionUserName, fusionPassword)
		#createReport(instanceURL, folderPath, fusionUserName, fusionPassword)
		resultXML = runReport(instanceURL, input_sql, folderPath, folderPath + "/FSTreport.xdo", fusionUserName, fusionPassword)
		return resultXML
	except:
		return "Error running the SQL query. Please validate the URL, Credentials, Query or your network connection"

def initFusion(instanceURI, uname, pw):
	createDataModel(folderPath, instanceURI, uname, pw)
	createReport(instanceURI, folderPath, uname, pw)
#objectExists(instanceURL, folderPath + "/FSTreport.xdm", fusionUserName, fusionPassword)
#runSQL('https://ekjy-test.fa.em2.oraclecloud.com', input_sql, 'eyadmin', 'Welcome@123')