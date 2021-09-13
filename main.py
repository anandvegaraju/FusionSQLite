import base64
import re
from moz_sql_parser import parse
import json
import xml.dom.minidom
import requests
from bs4 import BeautifulSoup

folderPath = '/Custom/Human Capital Management/FusionSQLtoolTest1'

def createDataModel(folderPath, instanceURL, fusionUserName, fusionPassword, inputSQLtxt):

	url = instanceURL + "/xmlpserver/services/v2/CatalogService"
	if objectExists(instanceURL, folderPath + "/FusionSQLToolDM.xdm", fusionUserName, fusionPassword) == 'false':
		print('DM does not exist. Creating DM.....')
		payload = "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:v2=\"http://xmlns.oracle.com/oxp/service/v2\">\r\n   <soapenv:Header/>\r\n   <soapenv:Body>\r\n      <v2:createObject>\r\n         <v2:folderAbsolutePathURL>" + folderPath + "</v2:folderAbsolutePathURL>\r\n         <v2:objectName>FusionSQLToolDM</v2:objectName>\r\n         <v2:objectType>xdm</v2:objectType>\r\n         <v2:objectDescription>testing 1</v2:objectDescription>\r\n         <v2:objectData>" + "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" + "</v2:objectData>\r\n         <v2:userID>" + fusionUserName + "</v2:userID>\r\n         <v2:password>" + fusionPassword + "</v2:password>\r\n      </v2:createObject>\r\n   </soapenv:Body>\r\n</soapenv:Envelope>"
		headers = {
  		'Content-Type': 'text/xml;charset=UTF-8',
  		'Host': instanceURL.replace('https://',''),
  		'SOAPAction': '""'
		}
		response = requests.request("POST", url, headers=headers, data = payload)
		#print(response.text.encode('utf8'))
	else:
		print('DM already exists.')
		xdmData = '''<?xml version = '1.0' encoding = 'utf-8'?>
<dataModel xmlns="http://xmlns.oracle.com/oxp/xmlp" version="2.0" xmlns:xdm="http://xmlns.oracle.com/oxp/xmlp" xmlns:xsd="http://wwww.w3.org/2001/XMLSchema" defaultDataSourceRef="AuditViewDB">
   <description>
      <![CDATA[undefined]]>
   </description>
   <dataProperties>
      <property name="include_parameters" value="false"/>
      <property name="include_null_Element" value="true"/>
      <property name="include_rowsettag" value="false"/>
      <property name="exclude_tags_for_lob" value="false"/>
      <property name="xml_tag_case" value="upper"/>
      <property name="generate_output_format" value="xml"/>
      <property name="sql_monitor_report_generated" value="false"/>
      <property name="optimize_query_executions" value="false"/>
   </dataProperties>
   <dataSets>
      <dataSet name="FST2" type="simple">
         <sql dataSourceRef="ApplicationDB_HCM" nsQuery="true" sp="true" xmlRowTagName="" bindMultiValueAsCommaSepStr="false">
            <![CDATA[DECLARE
    type refcursor is REF CURSOR;
    xdo_cursor refcursor;
        queryStr varchar2(32767);
    BEGIN
    queryStr := '{}';
    OPEN :xdo_cursor FOR queryStr;
END;]]>
         </sql>
      </dataSet>
   </dataSets>
   <output rootName="DATA_DS" uniqueRowName="false">
      <nodeList name="FST2"/>
   </output>
   <eventTriggers/>
   <lexicals/>
   <parameters>
      <parameter name="xdo_cursor" dataType="xsd:string" rowPlacement="1">
         <input/>
      </parameter>
   </parameters>
   <valueSets/>
   <bursting/>
   <validations>
      <validation>N</validation>
   </validations>
   <display>
      <layouts>
         <layout name="FST2" left="280px" top="349px"/>
         <layout name="DATA_DS" left="0px" top="349px"/>
      </layouts>
      <groupLinks/>
   </display>
</dataModel>
'''.format(inputSQLtxt)
		encodedXDM = base64.b64encode(bytes(xdmData, encoding='utf8'))
		payload="<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:v2=\"http://xmlns.oracle.com/oxp/service/v2\">\r\n    <soapenv:Header/>\r\n    <soapenv:Body>\r\n        <v2:updateObject>\r\n            <v2:objectAbsolutePath>/Custom/Human Capital Management/FusionSQLtoolTest1/FusionSQLToolDM.xdm</v2:objectAbsolutePath>\r\n            <v2:objectData>" + str(encodedXDM.decode("utf-8")) + "</v2:objectData>\r\n            <v2:userID>" + fusionUserName + "</v2:userID>\r\n            <v2:password>" + fusionPassword + "</v2:password>\r\n        </v2:updateObject>\r\n    </soapenv:Body>\r\n</soapenv:Envelope>"
		headers = {
		'Content-Type': 'text/xml;charset=UTF-8',
		'Host': instanceURL.replace('https://',''),
		'SOAPAction': '""'
		}
		response = requests.request("POST", url, headers=headers, data=payload)
		print(response)

	

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
	objExists = soup.find('objectExistReturn').string
	if objectExists is not None:
		return soup.find('objectExistReturn').string
	else:
		return "false"

def runReport(instanceURL, folderPath, reportPath, fusionUserName, fusionPassword):
	#input_sql = input_sql.replace('&','&amp;').replace('=','&#61;').replace('<','&lt;').replace('>','&gt;')
	url = instanceURL + "/xmlpserver/services/v2/ReportService"
	payload = "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:v2=\"http://xmlns.oracle.com/oxp/service/v2\">\r\n    <soapenv:Header/>\r\n    <soapenv:Body>\r\n        <v2:runReport>\r\n            <v2:reportRequest>\r\n                <v2:attributeFormat>xml</v2:attributeFormat>\r\n                <v2:byPassCache>True</v2:byPassCache>\r\n                <v2:flattenXML>True</v2:flattenXML>\r\n                <v2:reportAbsolutePath>" + reportPath + "</v2:reportAbsolutePath>\r\n                <v2:sizeOfDataChunkDownload>-1</v2:sizeOfDataChunkDownload>\r\n            </v2:reportRequest>\r\n            <v2:userID>" + fusionUserName + "</v2:userID>\r\n            <v2:password>" + fusionPassword + "</v2:password>\r\n        </v2:runReport>\r\n    </soapenv:Body>\r\n</soapenv:Envelope>"
	headers = {
	'Content-Type': 'text/xml;charset=UTF-8',
	'Host': instanceURL.replace('https://',''),
	'SOAPAction': '""'
	}
	try:
		response = requests.request("POST", url, headers=headers, data = payload)
		soup = BeautifulSoup(response.text.encode('utf8'), 'xml')
	except:
		createDataModel(folderPath, instanceURL, fusionUserName, fusionPassword, '')
		createReport(instanceURL, folderPath, fusionUserName, fusionPassword)
	try:
		reportBytes = soup.find('reportBytes').string
		return base64.b64decode(reportBytes).decode('UTF-8')
	except:
		return str(soup.find('faultstring').text)


def runSQL(instanceURL, input_sql, fusionUserName, fusionPassword):
	try:
		createDataModel(folderPath, instanceURL, fusionUserName, fusionPassword, input_sql.replace("'","''"))
		#createReport(instanceURL, folderPath, fusionUserName, fusionPassword)
		resultXML = runReport(instanceURL, folderPath, folderPath + "/FSTreport.xdo", fusionUserName, fusionPassword)
		return resultXML
	except:
		return "Error running the SQL query. Please validate the URL, Credentials, Query or your network connection"

def initFusion(instanceURI, uname, pw):
	createDataModel(folderPath, instanceURI, uname, pw, '')
	createReport(instanceURI, folderPath, uname, pw)
#objectExists(instanceURL, folderPath + "/FSTreport.xdm", fusionUserName, fusionPassword)
